// src/routes/trips.js
// Router for employee trip and ride history details

const express = require('express');
const { prisma, withRetry } = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { startSimulation, stopSimulation, activeLocations } = require('../lib/tripSimulator');

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
      ? ['completed', 'payment_completed', 'cancelled']
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
    const trip = await withRetry(() => prisma.trip.findUnique({ 
      where: { id },
      include: { ride: true }
    }));
    
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    if (trip.driverId !== req.user.id) {
      return res.status(403).json({ message: 'Only the driver can update the trip status.' });
    }

    const currentStatus = trip.status;
    const allowedTransitions = {
      booked: ['started', 'cancelled'],
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
      if (trip.ride?.routeGeoJson) {
        startSimulation(id, trip.ride.routeGeoJson, req.app.get('trackingNs'));
      }
    } else if (status === 'completed') {
      updateData.completedAt = new Date();
      // Auto-transition to payment_pending
      updateData.status = 'payment_pending';
      stopSimulation(id);
    } else if (status === 'cancelled') {
      updateData.completedAt = new Date();
      stopSimulation(id);
      // Also cancel underlying ride so passengers can't keep booking it
      await withRetry(() => prisma.ride.update({ where: { id: trip.rideId }, data: { status: 'cancelled' } }));
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

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/trips/:id/cancel
// Passenger cancels their own booking (only before trip starts)
// Cancellation rules:
//   1. Passenger may only cancel if trip status is 'booked'
//   2. Cancellation refunds the fare to the passenger's wallet
//   3. Returns seats to the ride's available count
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id/cancel', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const trip = await withRetry(() =>
      prisma.trip.findUnique({
        where: { id },
        include: {
          ride: true,
          passengers: true,
          transactions: {
            where: {
              userId: req.user.id,
              type: 'payment',
              status: 'completed'
            }
          }
        }
      })
    );

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    // Rule 1: Only booked trips can be cancelled by a passenger
    if (trip.status !== 'booked') {
      return res.status(400).json({
        message: `Cannot cancel: Trip is already ${trip.status.replace('_', ' ')}. Cancellation is only allowed before the trip starts.`
      });
    }

    // Rule 2: Requester must be a passenger of this trip (not the driver)
    const isPassenger = trip.passengers.some(p => p.userId === req.user.id);
    if (!isPassenger) {
      return res.status(403).json({ message: 'Only a passenger of this trip can cancel their booking.' });
    }

    // Rule 3: Cannot cancel within 1 hour of departure
    const departureTime = new Date(trip.ride?.datetime || trip.createdAt);
    const hoursUntilDeparture = (departureTime.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilDeparture < 1) {
      return res.status(400).json({
        message: 'Cancellation is not allowed within 1 hour of departure.'
      });
    }

    // Process refund: If passenger paid via wallet, refund them
    let refundedAmount = 0;
    if (trip.transactions.length > 0) {
      const paidAmount = trip.transactions.reduce((sum, t) => sum + t.amount, 0);
      if (paidAmount > 0) {
        // Refund to wallet
        await withRetry(() =>
          prisma.wallet.update({
            where: { userId: req.user.id },
            data: { balance: { increment: paidAmount } }
          })
        );
        // Record refund transaction
        await withRetry(() =>
          prisma.transaction.create({
            data: {
              userId: req.user.id,
              tripId: id,
              amount: paidAmount,
              type: 'refund',
              method: 'wallet',
              status: 'completed'
            }
          })
        );
        refundedAmount = paidAmount;
      }
    }

    // Remove passenger from trip
    await withRetry(() =>
      prisma.tripPassenger.delete({
        where: {
          tripId_userId: { tripId: id, userId: req.user.id }
        }
      })
    );

    // Restore seat availability on the ride
    await withRetry(() =>
      prisma.ride.update({
        where: { id: trip.rideId },
        data: { availableSeats: { increment: 1 } }
      })
    );

    // Also update booking record to cancelled
    await withRetry(() =>
      prisma.booking.updateMany({
        where: { rideId: trip.rideId, passengerId: req.user.id },
        data: { status: 'cancelled' }
      })
    );

    return res.status(200).json({
      message: `Booking cancelled successfully.${refundedAmount > 0 ? ` ₹${refundedAmount} refunded to your wallet.` : ''}`,
      refundedAmount
    });
  } catch (err) {
    console.error('[cancelTrip]', err);
    return res.status(500).json({ message: 'Failed to cancel booking.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/trips/:id/messages
// Fetch persistent chat history for a specific trip
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/messages', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const messages = await withRetry(() =>
      prisma.message.findMany({
        where: { tripId: id },
        include: {
          sender: {
            select: { id: true, name: true, photoUrl: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      })
    );
    return res.status(200).json(messages);
  } catch (err) {
    console.error('[getTripMessages]', err);
    return res.status(500).json({ message: 'Failed to fetch trip messages.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/trips/:id/location
// REST fallback to get the last known location from the simulator's activeLocations
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/location', requireAuth, async (req, res) => {
  const { id } = req.params;
  const location = activeLocations.get(id);

  if (location) {
    return res.status(200).json(location);
  } else {
    return res.status(404).json({ message: 'Live location not available for this trip.' });
  }
});

module.exports = router;
