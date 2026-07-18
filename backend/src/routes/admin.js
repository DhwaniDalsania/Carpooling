const express = require('express');
const bcrypt = require('bcryptjs');
const { prisma, withRetry } = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 10;

// Apply admin role middleware to all routes in this router
router.use(requireAuth);
router.use(requireRole('admin'));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/stats
// Scoped to the organization
// ─────────────────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const orgId = req.user.organizationId;

    const totalEmployees = await withRetry(() =>
      prisma.user.count({
        where: { organizationId: orgId }
      })
    );

    const registeredVehicles = await withRetry(() =>
      prisma.vehicle.count({
        where: {
          user: { organizationId: orgId }
        }
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
    return res.status(500).json({ message: 'Failed to fetch admin stats.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/employees
// List employees in organization
// ─────────────────────────────────────────────────────────────────────────────
router.get('/employees', async (req, res) => {
  try {
    const employees = await withRetry(() =>
      prisma.user.findMany({
        where: { organizationId: req.user.organizationId },
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
          managerName: true,
          location: true,
          platformAccess: true
        },
        orderBy: { name: 'asc' }
      })
    );

    return res.status(200).json(employees);
  } catch (err) {
    console.error('[adminEmployees]', err);
    return res.status(500).json({ message: 'Failed to fetch employees list.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/employees
// Add a new employee to the organization
// ─────────────────────────────────────────────────────────────────────────────
router.post('/employees', async (req, res) => {
  const { name, email, password, department, managerName, location } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }

  try {
    const existing = await withRetry(() => prisma.user.findUnique({ where: { email } }));
    if (existing) {
      return res.status(409).json({ message: 'Employee with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const newEmployee = await withRetry(() =>
      prisma.user.create({
        data: {
          name,
          email,
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

    // Auto-create wallet
    await withRetry(() => prisma.wallet.create({ data: { userId: newEmployee.id, balance: 0 } }));

    return res.status(201).json({
      message: 'Employee added successfully!',
      employee: {
        id: newEmployee.id,
        name: newEmployee.name,
        email: newEmployee.email,
        department: newEmployee.department,
        managerName: newEmployee.managerName,
        location: newEmployee.location,
        platformAccess: newEmployee.platformAccess
      }
    });
  } catch (err) {
    console.error('[adminAddEmployee]', err);
    return res.status(500).json({ message: 'Failed to create employee.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/employees/:id/access
// Toggle platformAccess (grant/revoke)
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/employees/:id/access', async (req, res) => {
  const { id } = req.params;

  if (id === req.user.id) {
    return res.status(400).json({ message: 'You cannot revoke platform access for yourself.' });
  }

  try {
    const employee = await withRetry(() => prisma.user.findUnique({ where: { id } }));
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    if (employee.organizationId !== req.user.organizationId) {
      return res.status(403).json({ message: 'Unauthorized.' });
    }

    const updated = await withRetry(() =>
      prisma.user.update({
        where: { id },
        data: { platformAccess: !employee.platformAccess },
        select: {
          id: true,
          name: true,
          platformAccess: true
        }
      })
    );

    return res.status(200).json({
      message: `Access ${updated.platformAccess ? 'granted' : 'revoked'} successfully.`,
      employee: updated
    });
  } catch (err) {
    console.error('[adminToggleAccess]', err);
    return res.status(500).json({ message: 'Failed to toggle employee access.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/vehicles
// List vehicles of organization
// ─────────────────────────────────────────────────────────────────────────────
router.get('/vehicles', async (req, res) => {
  try {
    const vehicles = await withRetry(() =>
      prisma.vehicle.findMany({
        where: {
          user: { organizationId: req.user.organizationId }
        },
        include: {
          user: {
            select: { name: true }
          }
        },
        orderBy: { registrationNumber: 'asc' }
      })
    );

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
    return res.status(500).json({ message: 'Failed to fetch vehicles list.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/vehicles/:id/status
// Set active/inactive status
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/vehicles/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (status !== 'active' && status !== 'inactive') {
    return res.status(400).json({ message: 'Status must be active or inactive.' });
  }

  try {
    const vehicle = await withRetry(() => prisma.vehicle.findUnique({ where: { id }, include: { user: true } }));
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found.' });
    }

    if (vehicle.user.organizationId !== req.user.organizationId) {
      return res.status(403).json({ message: 'Unauthorized.' });
    }

    const updated = await withRetry(() =>
      prisma.vehicle.update({
        where: { id },
        data: { status },
        select: {
          id: true,
          registrationNumber: true,
          status: true
        }
      })
    );

    return res.status(200).json({
      message: 'Vehicle status updated successfully.',
      vehicle: updated
    });
  } catch (err) {
    console.error('[adminVehicleStatus]', err);
    return res.status(500).json({ message: 'Failed to update vehicle status.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/settings
// Fetch current organization details
// ─────────────────────────────────────────────────────────────────────────────
router.get('/settings', async (req, res) => {
  try {
    const org = await withRetry(() =>
      prisma.organization.findUnique({
        where: { id: req.user.organizationId }
      })
    );

    if (!org) {
      return res.status(404).json({ message: 'Organization not found.' });
    }

    return res.status(200).json({
      id: org.id,
      name: org.name,
      registeredAddress: org.registeredAddress,
      industry: org.industry,
      adminContact: org.adminContact,
      code: org.code,
      fuelCostPerLitre: org.fuelCostPerLitre,
      costPerKm: org.costPerKm,
      travelCostPerKm: org.travelCostPerKm
    });
  } catch (err) {
    console.error('[adminGetSettings]', err);
    return res.status(500).json({ message: 'Failed to fetch settings.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/settings
// Update organization details
// ─────────────────────────────────────────────────────────────────────────────
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
      message: 'Organization settings updated successfully.',
      settings: {
        id: updated.id,
        name: updated.name,
        registeredAddress: updated.registeredAddress,
        industry: updated.industry,
        adminContact: updated.adminContact,
        code: updated.code,
        fuelCostPerLitre: updated.fuelCostPerLitre,
        costPerKm: updated.costPerKm,
        travelCostPerKm: updated.travelCostPerKm
      }
    });
  } catch (err) {
    console.error('[adminUpdateSettings]', err);
    return res.status(500).json({ message: 'Failed to update settings.' });
  }
});

module.exports = router;
