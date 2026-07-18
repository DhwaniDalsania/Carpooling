// src/routes/trips.js
// Router for employee trip and ride history details

const express = require('express');
const { prisma, withRetry } = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/trips
// Fetch all trips for the authenticated user (either driver or passenger)
// Query param: history=true/false
// ─────────────────────────────────────────────────────────────────────────────
router.get(['/', '/mine'], requireAuth, async (req, res) => {
  const showHistory = req.query.history === 'true';

  try {
    // History statuses vs Active statuses
    const statuses = showHistory
      ? ['completed', 'payment_completed']
      : ['booked', 'started', 'in_progress', 'payment_pending'];

    const trips = await withRetry(() =>
      prisma.trip.findMany({
        where: {
          status: { in: statuses },
          OR: [
            { driverId: req.user.id },
            {
              passengers: {
                some: { userId: req.user.id }
              }
            }
          ]
        },
        include: {
          ride: true,
          driver: {
            select: { id: true, name: true, photoUrl: true }
          },
          vehicle: true,
          passengers: {
            include: {
              user: {
                select: { id: true, name: true, photoUrl: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    );

    return res.status(200).json(trips);
  } catch (err) {
    console.error('[getTrips]', err);
    return res.status(500).json({ message: 'Failed to fetch trips.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/trips/:id/status
// Update trip status with validation
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/status', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ message: 'Status is required.' });
  }

  try {
    const trip = await withRetry(() => prisma.trip.findUnique({ where: { id } }));
    
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    if (trip.driverId !== req.user.id) {
      return res.status(403).json({ message: 'Only the driver can update the trip status.' });
    }

    const currentStatus = trip.status;
    const allowedTransitions = {
      booked: ['started'],
      started: ['in_progress'],
      in_progress: ['completed'],
      completed: ['payment_pending'],
      payment_pending: ['payment_completed']
    };

    if (!allowedTransitions[currentStatus]?.includes(status)) {
      return res.status(400).json({ message: `Invalid status transition from ${currentStatus} to ${status}.` });
    }

    // Prepare update data
    const updateData = { status };

    if (status === 'started') {
      updateData.startedAt = new Date();
    } else if (status === 'completed') {
      updateData.completedAt = new Date();
      // Auto-transition to payment_pending
      updateData.status = 'payment_pending';
    }

    const updatedTrip = await withRetry(() => prisma.trip.update({
      where: { id },
      data: updateData
    }));

    return res.status(200).json({ message: 'Status updated successfully', trip: updatedTrip });
  } catch (err) {
    console.error('[updateTripStatus]', err);
    return res.status(500).json({ message: 'Failed to update trip status.' });
  }
});

module.exports = router;
