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
router.get('/', requireAuth, async (req, res) => {
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

module.exports = router;
