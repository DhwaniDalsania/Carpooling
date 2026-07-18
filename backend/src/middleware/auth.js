// src/middleware/auth.js
// JWT verification middleware — attach req.user on success.

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_me';

const { prisma, withRetry } = require('../lib/prisma');

/**
 * Verifies Bearer token, injects req.user = { id, email, role, organizationId }.
 * Returns 401 if missing/invalid, 403 if platformAccess is false.
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);

    // Live check if platformAccess is revoked by Admin
    const user = await withRetry(() =>
      prisma.user.findUnique({
        where: { id: payload.id },
        select: { platformAccess: true }
      })
    );

    if (!user || !user.platformAccess) {
      return res.status(403).json({ message: 'Your account access has been revoked. Contact your admin.' });
    }

    req.user = payload; // { id, email, role, organizationId }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

/**
 * Middleware factory: restrict to specific roles.
 * Usage: requireRole('admin')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
