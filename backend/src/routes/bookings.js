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
    // 1. Fetch the ride and make sure it has capacity
    const ride = await withRetry(() =>
      prisma.ride.findUnique({
        where: { id: rideId }
      })
    );

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found.' });
    }

    if (ride.status !== 'active') {
      return res.status(400).json({ message: `Cannot book: ride is currently ${ride.status}.` });
    }

    if (ride.availableSeats < seatsToBook) {
      return res.status(400).json({ message: `Insufficient seats. Only ${ride.availableSeats} seats left.` });
    }

    // 2. Decrement seats and update status
    const remainingSeats = ride.availableSeats - seatsToBook;
    const newStatus = remainingSeats === 0 ? 'full' : 'active';

    await withRetry(() =>
      prisma.ride.update({
        where: { id: rideId },
        data: {
          availableSeats: remainingSeats,
          status: newStatus
        }
      })
    );

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

    // 4. Create the Trip entry representing the trip execution session
    const trip = await withRetry(() =>
      prisma.trip.create({
        data: {
          rideId,
          driverId: ride.driverId,
          vehicleId: ride.vehicleId,
          status: 'booked',
          fare: ride.farePerSeat * seatsToBook,
        }
      })
    );

    // 5. Connect the passenger to the trip via the TripPassenger join table
    await withRetry(() =>
      prisma.tripPassenger.create({
        data: {
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

module.exports = router;
