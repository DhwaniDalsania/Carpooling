// src/routes/admin.js
// Router for Company Administrators to manage employees, vehicles, and settings

const express = require('express');
const { prisma, withRetry } = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

const router = express.Router();

async function generateUniqueInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let isUnique = false;
  let code = '';
  while (!isUnique) {
    code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const existing = await withRetry(() =>
      prisma.organization.findUnique({ where: { code } })
    );
    if (!existing) {
      isUnique = true;
    }
  }
  return code;
}

// Apply admin access restriction to all sub-routes
router.use(requireAuth, requireRole('admin'));

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// GET /api/admin/stats
// Fetch admin dashboard counters
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
router.get('/stats', async (req, res) => {
  try {
    const orgId = req.user.organizationId;

    const totalEmployees = await withRetry(() =>
      prisma.user.count({ where: { organizationId: orgId } })
    );

    const registeredVehicles = await withRetry(() =>
      prisma.vehicle.count({
        where: { user: { organizationId: orgId } }
      })
    );

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const ridesThisMonth = await withRetry(() =>
      prisma.ride.count({
        where: {
          driver: { organizationId: orgId },
          datetime: { gte: startOfMonth }
        }
      })
    );

    return res.status(200).json({
      totalEmployees,
      registeredVehicles,
      ridesThisMonth
    });
  } catch (err) {
    console.error('[adminStats]', err);
    return res.status(500).json({ message: 'Failed to retrieve admin stats.' });
  }
});

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// GET /api/admin/employees
// Fetch all employees in the organization
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
router.get('/employees', async (req, res) => {
  try {
    const employees = await withRetry(() =>
      prisma.user.findMany({
        where: { organizationId: req.user.organizationId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
          managerName: true,
          location: true,
          platformAccess: true,
          createdAt: true,
          organization: {
            select: { code: true }
          }
        },
        orderBy: { name: 'asc' }
      })
    );
    return res.status(200).json(employees);
  } catch (err) {
    console.error('[adminEmployees]', err);
    return res.status(500).json({ message: 'Failed to retrieve employee list.' });
  }
});

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// POST /api/admin/employees
// Create a new employee directly
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
router.post('/employees', async (req, res) => {
  const { name, email, password, department, managerName, location } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }

  try {
    const existing = await withRetry(() =>
      prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    );

    if (existing) {
      return res.status(400).json({ message: 'Email address already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await withRetry(() =>
      prisma.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          passwordHash,
          role: 'employee',
          organizationId: req.user.organizationId,
          department: department || null,
          managerName: managerName || null,
          location: location || null,
          platformAccess: true
        }
      })
    );

    // Auto-create wallet for new employee
    await withRetry(() =>
      prisma.wallet.create({
        data: { userId: newUser.id, balance: 500.0 }
      })
    );

    return res.status(201).json({
      message: 'Employee registered successfully.',
      userId: newUser.id
    });
  } catch (err) {
    console.error('[adminAddEmployee]', err);
    return res.status(500).json({ message: 'Failed to create employee.' });
  }
});

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// PATCH /api/admin/employees/:id/access
// Toggle platform access for an employee
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
router.patch('/employees/:id/access', async (req, res) => {
  const { platformAccess } = req.body;
  const { id } = req.params;

  if (platformAccess === undefined) {
    return res.status(400).json({ message: 'platformAccess parameter is required.' });
  }

  try {
    const userToEdit = await withRetry(() =>
      prisma.user.findUnique({ where: { id } })
    );

    if (!userToEdit || userToEdit.organizationId !== req.user.organizationId) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    if (userToEdit.id === req.user.id) {
      return res.status(400).json({ message: 'Admins cannot revoke their own access.' });
    }

    await withRetry(() =>
      prisma.user.update({
        where: { id },
        data: { platformAccess: !!platformAccess }
      })
    );

    return res.status(200).json({ message: 'Employee access status updated.' });
  } catch (err) {
    console.error('[adminToggleAccess]', err);
    return res.status(500).json({ message: 'Failed to update access status.' });
  }
});

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// GET /api/admin/vehicles
// Fetch all registered vehicles in the organization
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
router.get('/vehicles', async (req, res) => {
  try {
    const vehicles = await withRetry(() =>
      prisma.vehicle.findMany({
        where: { user: { organizationId: req.user.organizationId } },
        include: {
          user: {
            select: { name: true }
          }
        },
        orderBy: { registrationNumber: 'asc' }
      })
    );

    // Map to driver name directly as requested
    const formatted = vehicles.map(v => ({
      id: v.id,
      registrationNumber: v.registrationNumber,
      model: v.model,
      seatingCapacity: v.seatingCapacity,
      driver: v.user?.name || 'Unknown',
      status: v.status
    }));

    return res.status(200).json(formatted);
  } catch (err) {
    console.error('[adminVehicles]', err);
    return res.status(500).json({ message: 'Failed to retrieve vehicle list.' });
  }
});

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// PATCH /api/admin/vehicles/:id/status
// Set vehicle active/inactive
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
router.patch('/vehicles/:id/status', async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;

  if (status !== 'active' && status !== 'inactive') {
    return res.status(400).json({ message: "Status must be 'active' or 'inactive'." });
  }

  try {
    const vehicle = await withRetry(() =>
      prisma.vehicle.findUnique({
        where: { id },
        include: { user: true }
      })
    );

    if (!vehicle || vehicle.user.organizationId !== req.user.organizationId) {
      return res.status(404).json({ message: 'Vehicle not found.' });
    }

    await withRetry(() =>
      prisma.vehicle.update({
        where: { id },
        data: { status }
      })
    );

    return res.status(200).json({ message: 'Vehicle status updated successfully.' });
  } catch (err) {
    console.error('[adminUpdateVehicleStatus]', err);
    return res.status(500).json({ message: 'Failed to update vehicle status.' });
  }
});

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// GET /api/admin/settings
// Fetch organization-wide configuration
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
router.get('/settings', async (req, res) => {
  try {
    const org = await withRetry(() =>
      prisma.organization.findUnique({
        where: { id: req.user.organizationId }
      })
    );
    return res.status(200).json({
      name: org.name,
      registeredAddress: org.registeredAddress,
      industry: org.industry,
      adminContact: org.adminContact,
      fuelCostPerLitre: org.fuelCostPerLitre,
      costPerKm: org.costPerKm,
      travelCostPerKm: org.travelCostPerKm,
      code: org.code
    });
  } catch (err) {
    console.error('[adminGetSettings]', err);
    return res.status(500).json({ message: 'Failed to retrieve settings.' });
  }
});

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// PATCH /api/admin/settings
// Update organization configuration
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
router.patch('/settings', async (req, res) => {
  const { name, registeredAddress, industry, adminContact, fuelCostPerLitre, costPerKm, travelCostPerKm } = req.body;

  try {
    const updated = await withRetry(() =>
      prisma.organization.update({
        where: { id: req.user.organizationId },
        data: {
          name: name !== undefined ? name : undefined,
          registeredAddress: registeredAddress !== undefined ? registeredAddress : undefined,
          industry: industry !== undefined ? industry : undefined,
          adminContact: adminContact !== undefined ? adminContact : undefined,
          fuelCostPerLitre: fuelCostPerLitre !== undefined ? parseFloat(fuelCostPerLitre) : undefined,
          costPerKm: costPerKm !== undefined ? parseFloat(costPerKm) : undefined,
          travelCostPerKm: travelCostPerKm !== undefined ? parseFloat(travelCostPerKm) : undefined
        }
      })
    );

    return res.status(200).json({
      message: 'Organization configurations updated successfully.',
      organization: updated
    });
  } catch (err) {
    console.error('[adminUpdateSettings]', err);
    return res.status(500).json({ message: 'Failed to update settings.' });
  }
});

// POST /api/admin/settings/regenerate-code
// Regenerate organization invite code
router.post('/settings/regenerate-code', async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const generatedCode = await generateUniqueInviteCode();
    
    await withRetry(() =>
      prisma.organization.update({
        where: { id: orgId },
        data: { code: generatedCode }
      })
    );
    
    return res.status(200).json({
      message: 'Organization invite code regenerated successfully.',
      code: generatedCode
    });
  } catch (err) {
    console.error('[regenerateInviteCode]', err);
    return res.status(500).json({ message: 'Failed to regenerate invite code.' });
  }
});

module.exports = router;
