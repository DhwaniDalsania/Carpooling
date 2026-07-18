// src/routes/bookings.js
// Router for ride bookings

const express = require('express');
const { prisma, withRetry } = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/bookings
// Book a seat in a ride, spawning Booking, Trip, and TripPassenger records
// Headers: Authorization: Bearer <token>
// Body: { rideId, seatsBooked }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const { rideId, seatsBooked } = req.body;

  if (!rideId) {
    return res.status(400).json({ message: 'rideId is required to book a seat.' });
  }

  const seatsToBook = parseInt(seatsBooked, 10) || 1;

  try {
    // 1. Perform atomic database-level seat hold verification and decrement
    const updateResult = await withRetry(() =>
      prisma.ride.updateMany({
        where: {
          id: rideId,
          status: 'active',
          availableSeats: { gte: seatsToBook }
        },
        data: {
          availableSeats: { decrement: seatsToBook }
        }
      })
    );

    if (updateResult.count === 0) {
      // Find reason for failure to return a helpful error message
      const currentRide = await withRetry(() => prisma.ride.findUnique({ where: { id: rideId } }));
      if (!currentRide) {
        return res.status(404).json({ message: 'Ride not found.' });
      }
      if (currentRide.status !== 'active') {
        return res.status(400).json({ message: `Cannot book: ride is currently ${currentRide.status}.` });
      }
      return res.status(400).json({ message: `Insufficient seats. Only ${currentRide.availableSeats} seats left.` });
    }

    // Fetch the updated ride to verify if status needs to be updated to 'full'
    const ride = await withRetry(() => prisma.ride.findUnique({ where: { id: rideId } }));
    if (ride.availableSeats === 0) {
      await withRetry(() =>
        prisma.ride.update({
          where: { id: rideId },
          data: { status: 'full' }
        })
      );
    }

    // 3. Create the Booking entry
    const booking = await withRetry(() =>
      prisma.booking.create({
        data: {
          rideId,
          passengerId: req.user.id,
          seatsBooked: seatsToBook,
          status: 'confirmed'
        }
      })
    );

    // 4. Create or update the Trip entry representing the physical ride session
    const additionalFare = ride.farePerSeat * seatsToBook;
    
    let trip = await withRetry(() => prisma.trip.findFirst({ where: { rideId } }));
    
    if (trip) {
      trip = await withRetry(() => prisma.trip.update({
        where: { id: trip.id },
        data: { fare: trip.fare + additionalFare }
      }));
    } else {
      trip = await withRetry(() => prisma.trip.create({
        data: {
          rideId,
          driverId: ride.driverId,
          vehicleId: ride.vehicleId,
          status: 'booked',
          fare: additionalFare,
        }
      }));
    }

    // 5. Connect the passenger to the trip via the TripPassenger join table
    await withRetry(() =>
      prisma.tripPassenger.upsert({
        where: {
          tripId_userId: {
            tripId: trip.id,
            userId: req.user.id
          }
        },
        update: {},
        create: {
          tripId: trip.id,
          userId: req.user.id
        }
      })
    );

    return res.status(201).json({
      message: 'Booking confirmed successfully!',
      booking,
      trip
    });
  } catch (err) {
    console.error('[createBooking]', err);
    return res.status(500).json({ message: 'Failed to create booking. Try again.' });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/bookings/:id/cancel
// Passenger cancels their own booking
// - Only allowed if trip hasn't started yet
// - Restores seats back to the ride
// - Removes passenger from TripPassenger
// - Decreases trip fare
// - Issues wallet refund if pre-paid via wallet
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/cancel', requireAuth, async (req, res) => {
  const { id: bookingId } = req.params;

  try {
    const booking = await withRetry(() =>
      prisma.booking.findUnique({
        where: { id: bookingId },
        include: { ride: true }
      })
    );

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (booking.passengerId !== req.user.id) {
      return res.status(403).json({ message: 'You can only cancel your own bookings.' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Booking is already cancelled.' });
    }

    // Find the trip linked to this ride
    const trip = await withRetry(() =>
      prisma.trip.findFirst({
        where: { rideId: booking.rideId },
        include: {
          transactions: {
            where: {
              userId: req.user.id,
              type: 'payment',
              method: 'wallet',
              status: 'completed'
            }
          }
        }
      })
    );

    // Block cancellation if trip has already started or is in progress
    if (trip && ['started', 'in_progress', 'completed', 'payment_pending', 'payment_completed'].includes(trip.status)) {
      return res.status(400).json({ message: `Cannot cancel booking — the trip has already ${trip.status.replace('_', ' ')}.` });
    }

    const refundAmount = booking.ride.farePerSeat * booking.seatsBooked;

    // Build atomic transaction ops
    const ops = [
      // Mark booking as cancelled
      prisma.booking.update({ where: { id: bookingId }, data: { status: 'cancelled' } }),

      // Restore seats to the ride
      prisma.ride.update({
        where: { id: booking.rideId },
        data: {
          availableSeats: { increment: booking.seatsBooked },
          // Reopen ride if it was marked full
          status: booking.ride.status === 'full' ? 'active' : booking.ride.status
        }
      })
    ];

    // If trip exists, remove passenger and update fare
    if (trip) {
      ops.push(
        prisma.tripPassenger.deleteMany({
          where: { tripId: trip.id, userId: req.user.id }
        }),
        prisma.trip.update({
          where: { id: trip.id },
          data: { fare: { decrement: refundAmount } }
        })
      );

      // Wallet refund if there was a wallet payment transaction for this passenger
      const walletTxn = trip.transactions[0];
      if (walletTxn) {
        ops.push(
          // Refund passenger wallet
          prisma.wallet.upsert({
            where: { userId: req.user.id },
            update: { balance: { increment: walletTxn.amount } },
            create: { userId: req.user.id, balance: walletTxn.amount }
          }),
          // Deduct from driver's wallet (reverse the credit)
          prisma.wallet.upsert({
            where: { userId: trip.driverId },
            update: { balance: { decrement: walletTxn.amount } },
            create: { userId: trip.driverId, balance: 0 }
          }),
          // Log refund transaction
          prisma.transaction.create({
            data: {
              userId: req.user.id,
              tripId: trip.id,
              amount: walletTxn.amount,
              type: 'refund',
              method: 'wallet_refund',
              status: 'completed'
            }
          })
        );
      }
    }

    await withRetry(() => prisma.$transaction(ops));

    console.info('[cancelBooking] Passenger cancelled booking', { bookingId, passengerId: req.user.id, refundAmount });
    return res.status(200).json({ message: 'Booking cancelled successfully. Your seat has been released.' });
  } catch (err) {
    console.error('[cancelBooking]', err);
    return res.status(500).json({ message: 'Failed to cancel booking.' });
  }
});

module.exports = router;

