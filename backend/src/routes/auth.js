// src/routes/auth.js
// POST /api/auth/register  — create account (new org = admin, existing org = employee)
// POST /api/auth/login     — returns JWT
// GET  /api/auth/me        — returns current user (requires JWT)

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_me';
const SALT_ROUNDS = 10;

// ── Helper: sign JWT ──────────────────────────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// ── Helper: safe user shape (no passwordHash) ─────────────────────────────────
function safeUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// Body: { name, email, password, organizationCode, department?, managerName?, location?, photoUrl? }
// Logic:
//   - If organizationCode exists → join as employee
//   - If organizationCode does NOT exist → create the org + make this user admin
//     (requires orgName, registeredAddress, industry, adminContact in body)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const {
    name,
    email,
    password,
    organizationCode,
    // New org fields (only needed when creating a new org)
    orgName,
    registeredAddress,
    industry,
    adminContact,
    fuelCostPerLitre,
    costPerKm,
    travelCostPerKm,
    // User profile fields
    department,
    managerName,
    location,
    photoUrl,
  } = req.body;

  if (!name || !email || !password || !organizationCode) {
    return res.status(400).json({ message: 'name, email, password, organizationCode are required' });
  }

  try {
    // Check email uniqueness
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Find or create the organisation
    let org = await prisma.organization.findUnique({ where: { code: organizationCode } });
    let role = 'employee';

    if (!org) {
      // First user with this code → becomes admin and creates the org
      if (!orgName || !registeredAddress || !industry || !adminContact) {
        return res.status(400).json({
          message:
            'Organization not found. To create a new org, also provide: orgName, registeredAddress, industry, adminContact',
        });
      }
      org = await prisma.organization.create({
        data: {
          name: orgName,
          registeredAddress,
          industry,
          adminContact,
          code: organizationCode,
          fuelCostPerLitre: fuelCostPerLitre ?? 0,
          costPerKm: costPerKm ?? 0,
          travelCostPerKm: travelCostPerKm ?? 0,
        },
      });
      role = 'admin'; // First registrant becomes admin
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        organizationId: org.id,
        department: department ?? null,
        managerName: managerName ?? null,
        location: location ?? null,
        photoUrl: photoUrl ?? null,
      },
    });

    // Auto-create wallet with ₹0 balance
    await prisma.wallet.create({ data: { userId: user.id, balance: 0 } });

    return res.status(201).json({
      message: 'Account created successfully! Please log in.',
      role: user.role,
    });
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Body: { email, password }
// Returns: { token, user }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Revoked access check
    if (!user.platformAccess) {
      return res.status(403).json({ message: 'Your account access has been revoked. Contact your admin.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken(user);

    return res.status(200).json({
      token,
      user: safeUser(user),
    });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ message: 'Login failed. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me
// Headers: Authorization: Bearer <token>
// Returns: { user }
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { organization: true, wallet: true },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ user: safeUser(user) });
  } catch (err) {
    console.error('[me]', err);
    return res.status(500).json({ message: 'Failed to fetch user' });
  }
});

module.exports = router;
