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
    // Fetch the ride to verify existence and organization matching
    const rideToCheck = await withRetry(() =>
      prisma.ride.findUnique({
        where: { id: rideId },
        include: { driver: true }
      })
    );

    if (!rideToCheck) {
      return res.status(404).json({ message: 'Ride not found.' });
    }

    if (rideToCheck.driver.organizationId !== req.user.organizationId) {
      return res.status(403).json({ message: 'You can only book rides offered within your own organization.' });
    }

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
      if (rideToCheck.status !== 'active') {
        return res.status(400).json({ message: `Cannot book: ride is currently ${rideToCheck.status}.` });
      }
      return res.status(400).json({ message: `Insufficient seats. Only ${rideToCheck.availableSeats} seats left.` });
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

module.exports = router;
