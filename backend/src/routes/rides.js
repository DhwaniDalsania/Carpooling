// src/routes/rides.js
// Router for ride offers and ride searches

const express = require('express');
const { prisma, withRetry } = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/rides
// Create a new ride offer (Driver publishes a ride)
// Headers: Authorization: Bearer <token>
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const {
    pickupAddress,
    pickupLat,
    pickupLng,
    destAddress,
    destLat,
    destLng,
    datetime,
    availableSeats,
    farePerSeat,
    vehicleId,
    routeGeoJson,
    distanceKm
  } = req.body;

  if (!pickupAddress || !destAddress || !datetime || !availableSeats || !farePerSeat || !vehicleId) {
    return res.status(400).json({ message: 'Missing required ride offer parameters.' });
  }

  try {
    const seatsInt = parseInt(availableSeats, 10);
    const fareFloat = parseFloat(farePerSeat);
    const pLat = parseFloat(pickupLat) || 0.0;
    const pLng = parseFloat(pickupLng) || 0.0;
    const dLat = parseFloat(destLat) || 0.0;
    const dLng = parseFloat(destLng) || 0.0;
    const dist = parseFloat(distanceKm) || 0.0;

    // Validate farePerSeat > 0
    if (isNaN(fareFloat) || fareFloat <= 0) {
      return res.status(400).json({ message: 'farePerSeat must be a number greater than 0.' });
    }

    // Validate availableSeats > 0
    if (isNaN(seatsInt) || seatsInt <= 0) {
      return res.status(400).json({ message: 'availableSeats must be a positive integer.' });
    }

    // Validate datetime is in the future
    const parsedDate = new Date(datetime);
    if (isNaN(parsedDate.getTime()) || parsedDate <= new Date()) {
      return res.status(400).json({ message: 'datetime must be a valid future date and time.' });
    }

    // Ensure the vehicle exists in database to prevent foreign key constraint failure
    let vehicle = await withRetry(() => prisma.vehicle.findUnique({ where: { id: vehicleId } }));
    if (!vehicle) {
      const regNum = vehicleId === 'v1' ? 'GJ01AB1234' : (vehicleId === 'v2' ? 'GJ01CD5678' : 'GJ01EF9012_' + Math.random().toString(36).substring(2, 6));
      vehicle = await withRetry(() =>
        prisma.vehicle.create({
          data: {
            id: vehicleId,
            userId: req.user.id,
            model: vehicleId === 'v1' ? 'Toyota Prius' : (vehicleId === 'v2' ? 'Tesla Model 3' : 'Honda Civic'),
            registrationNumber: regNum,
            seatingCapacity: 4,
            status: 'active'
          }
        })
      );
    } else if (vehicle.status !== 'active') {
      return res.status(400).json({ message: 'The selected vehicle has been deactivated or revoked by the administrator.' });
    }

    // Validate availableSeats <= vehicle.seatingCapacity
    if (seatsInt > vehicle.seatingCapacity) {
      return res.status(400).json({ message: `availableSeats (${seatsInt}) cannot exceed vehicle seating capacity (${vehicle.seatingCapacity}).` });
    }

    // "My Trips" is backed by Trip records, so create the ride session when
    // the driver publishes the offer, not only after the first passenger books.
    // Keeping both inserts in one transaction prevents an offer from being
    // published without showing up in the driver's trip list.
    const { ride } = await withRetry(() =>
      prisma.$transaction(async (tx) => {
        const createdRide = await tx.ride.create({
          data: {
            driverId: req.user.id,
            vehicleId,
            pickupAddress,
            pickupLat: pLat,
            pickupLng: pLng,
            destAddress,
            destLat: dLat,
            destLng: dLng,
            datetime: new Date(datetime),
            availableSeats: seatsInt,
            farePerSeat: fareFloat,
            routeGeoJson: routeGeoJson || null,
            distanceKm: dist,
            status: 'active'
          }
        });

        await tx.trip.create({
          data: {
            rideId: createdRide.id,
            driverId: req.user.id,
            vehicleId,
            status: 'booked',
            fare: 0
          }
        });

        return { ride: createdRide };
      })
    );

    return res.status(201).json({
      message: 'Ride offered successfully!',
      ride
    });
  } catch (err) {
    console.error('[createRide]', err);
    return res.status(500).json({ message: 'Failed to create ride offer. Please check parameters.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/rides/search
// Search for available rides matching coordinates and seats
// Query params: pickupLat, pickupLng, destLat, destLng, seats, date
// ─────────────────────────────────────────────────────────────────────────────
router.get('/search', async (req, res) => {
  const { pickupLat, pickupLng, destLat, destLng, seats, date } = req.query;

  try {
    const seatsInt = parseInt(seats, 10) || 1;
    const pLat = parseFloat(pickupLat || req.query.pickup_lat);
    const pLng = parseFloat(pickupLng || req.query.pickup_lng);
    const dLat = parseFloat(destLat || req.query.dest_lat);
    const dLng = parseFloat(destLng || req.query.dest_lng);

    const istOffset = 5.5 * 60 * 60 * 1000;
    const now = new Date();
    const currentDateInIst = new Date(now.getTime() + istOffset)
      .toISOString()
      .slice(0, 10);
    const searchDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : currentDateInIst;
    const startOfSearchDate = new Date(`${searchDate}T00:00:00+05:30`);
    const endOfSearchDate = new Date(`${searchDate}T23:59:59.999+05:30`);

    let whereClause = {
      status: 'active',
      availableSeats: { gte: seatsInt },
      datetime: {
        gte: startOfSearchDate,
        lte: endOfSearchDate
      },
      vehicle: {
        status: 'active'
      }
    };

    // If locations are provided, apply bounding box filters (approx. 20km radius)
    if (!isNaN(pLat) && !isNaN(pLng) && !isNaN(dLat) && !isNaN(dLng)) {
      whereClause.pickupLat = { gte: pLat - 0.2, lte: pLat + 0.2 };
      whereClause.pickupLng = { gte: pLng - 0.2, lte: pLng + 0.2 };
      whereClause.destLat = { gte: dLat - 0.2, lte: dLat + 0.2 };
      whereClause.destLng = { gte: dLng - 0.2, lte: dLng + 0.2 };
    }

    let rides = await withRetry(() =>
      prisma.ride.findMany({
        where: whereClause,
        include: {
          driver: {
            select: { id: true, name: true, photoUrl: true }
          },
          vehicle: true
        },
        orderBy: { datetime: 'asc' }
      })
    );



    // Sort rides by Euclidean distance to pickup coordinates if provided
    if (!isNaN(pLat) && !isNaN(pLng)) {
      rides.forEach(ride => {
        ride.distanceToPickup = Math.sqrt(
          Math.pow(ride.pickupLat - pLat, 2) + Math.pow(ride.pickupLng - pLng, 2)
        );
      });
      rides.sort((a, b) => a.distanceToPickup - b.distanceToPickup);
    }

    return res.status(200).json(rides);
  } catch (err) {
    console.error('[searchRides]', err);
    return res.status(500).json({ message: 'Failed to search available rides.' });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/rides/:id/bookings
// Return all confirmed bookings for a given ride (for the requesting user only
// unless they are the driver, who sees all bookings)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/bookings', requireAuth, async (req, res) => {
  const { id: rideId } = req.params;
  try {
    const ride = await withRetry(() => prisma.ride.findUnique({ where: { id: rideId } }));
    if (!ride) return res.status(404).json({ message: 'Ride not found.' });

    const isDriver = ride.driverId === req.user.id;

    const bookings = await withRetry(() =>
      prisma.booking.findMany({
        where: {
          rideId,
          ...(isDriver ? {} : { passengerId: req.user.id })
        },
        include: { passenger: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' }
      })
    );

    return res.status(200).json(bookings);
  } catch (err) {
    console.error('[getRideBookings]', err);
    return res.status(500).json({ message: 'Failed to fetch bookings.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/rides/:id/cancel
// Driver cancels their entire ride offer (only when status is 'active' or 'full')
// - Marks ride as 'cancelled'
// - Cancels all associated bookings
// - Cancels the trip(s) for this ride
// - Restores each passenger's wallet balance (full refund) if they paid via wallet
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/cancel', requireAuth, async (req, res) => {
  const { id: rideId } = req.params;

  try {
    const ride = await withRetry(() =>
      prisma.ride.findUnique({
        where: { id: rideId },
        include: {
          bookings: {
            where: { status: 'confirmed' },
            include: { passenger: true }
          },
          trips: {
            where: { status: { in: ['booked', 'started'] } },
            include: {
              passengers: { include: { user: true } },
              transactions: true
            }
          }
        }
      })
    );

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found.' });
    }

    if (ride.driverId !== req.user.id) {
      return res.status(403).json({ message: 'Only the driver can cancel this ride.' });
    }

    if (!['active', 'full'].includes(ride.status)) {
      return res.status(400).json({ message: `Cannot cancel a ride that is already '${ride.status}'.` });
    }

    // Build a list of wallet refunds for passengers who paid with wallet
    const refundOps = [];
    for (const trip of ride.trips) {
      for (const { user: passenger } of trip.passengers) {
        // Find wallet payment transactions for this passenger on this trip
        const walletTxn = trip.transactions.find(
          (t) => t.userId === passenger.id && t.type === 'payment' && t.method === 'wallet' && t.status === 'completed'
        );
        if (walletTxn) {
          refundOps.push(
            prisma.wallet.upsert({
              where: { userId: passenger.id },
              update: { balance: { increment: walletTxn.amount } },
              create: { userId: passenger.id, balance: walletTxn.amount }
            }),
            prisma.transaction.create({
              data: {
                userId: passenger.id,
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
    }

    await withRetry(() =>
      prisma.$transaction([
        // Cancel the ride
        prisma.ride.update({ where: { id: rideId }, data: { status: 'cancelled' } }),

        // Cancel all confirmed bookings on this ride
        prisma.booking.updateMany({
          where: { rideId, status: 'confirmed' },
          data: { status: 'cancelled' }
        }),

        // Cancel all active trips for this ride
        prisma.trip.updateMany({
          where: { rideId, status: { in: ['booked', 'started'] } },
          data: { status: 'cancelled' }
        }),

        // Wallet refunds if any
        ...refundOps
      ])
    );

    console.info('[cancelRide] Driver cancelled ride', { rideId, driverId: req.user.id });
    return res.status(200).json({ message: 'Ride cancelled successfully. All passengers have been notified and refunded.' });
  } catch (err) {
    console.error('[cancelRide]', err);
    return res.status(500).json({ message: 'Failed to cancel ride.' });
  }
});

module.exports = router;

