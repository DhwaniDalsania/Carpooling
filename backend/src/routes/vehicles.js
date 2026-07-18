// src/routes/vehicles.js
// Router for employee vehicle management

const express = require('express');
const { prisma, withRetry } = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/vehicles
// Fetch all registered vehicles for the authenticated user
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const vehicles = await withRetry(() =>
      prisma.vehicle.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' }
      })
    );
    return res.status(200).json(vehicles);
  } catch (err) {
    console.error('[getVehicles]', err);
    return res.status(500).json({ message: 'Failed to fetch vehicles.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/vehicles
// Register a new vehicle for the authenticated user
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const { model, registrationNumber, seatingCapacity, status } = req.body;

  if (!model || !registrationNumber || !seatingCapacity) {
    return res.status(400).json({ message: 'model, registrationNumber, and seatingCapacity are required.' });
  }

  const normalizedReg = registrationNumber.trim().toUpperCase();

  try {
    // Check registration number uniqueness case-insensitively
    const existing = await withRetry(() =>
      prisma.vehicle.findFirst({
        where: { registrationNumber: { equals: normalizedReg, mode: 'insensitive' } }
      })
    );

    if (existing) {
      return res.status(409).json({ message: 'A vehicle with this registration number already exists.' });
    }

    const capacity = parseInt(seatingCapacity, 10);

    const vehicle = await withRetry(() =>
      prisma.vehicle.create({
        data: {
          userId: req.user.id,
          model,
          registrationNumber: normalizedReg,
          seatingCapacity: capacity,
          status: status || 'active'
        }
      })
    );

    return res.status(201).json(vehicle);
  } catch (err) {
    console.error('[createVehicle]', err);
    return res.status(500).json({ message: 'Failed to register vehicle.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/vehicles/:id
// Update vehicle details
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { model, registrationNumber, seatingCapacity, status } = req.body;

  if (!model || !registrationNumber || !seatingCapacity) {
    return res.status(400).json({ message: 'model, registrationNumber, and seatingCapacity are required.' });
  }

  const normalizedReg = registrationNumber.trim().toUpperCase();

  try {
    // Find the vehicle and check ownership
    const vehicle = await withRetry(() =>
      prisma.vehicle.findUnique({ where: { id } })
    );

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found.' });
    }

    if (vehicle.userId !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to update this vehicle.' });
    }

    // Check registration number uniqueness case-insensitively, excluding current vehicle
    const existing = await withRetry(() =>
      prisma.vehicle.findFirst({
        where: {
          registrationNumber: { equals: normalizedReg, mode: 'insensitive' },
          NOT: { id }
        }
      })
    );

    if (existing) {
      return res.status(409).json({ message: 'A vehicle with this registration number already exists.' });
    }

    const capacity = parseInt(seatingCapacity, 10);

    const updated = await withRetry(() =>
      prisma.vehicle.update({
        where: { id },
        data: {
          model,
          registrationNumber: normalizedReg,
          seatingCapacity: capacity,
          status: status || vehicle.status
        }
      })
    );

    return res.status(200).json(updated);
  } catch (err) {
    console.error('[updateVehicle]', err);
    return res.status(500).json({ message: 'Failed to update vehicle details.' });
  }
});

module.exports = router;
