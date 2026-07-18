// src/routes/reports.js
// Router for calculating travel analytics, fuel efficiency, and vehicle metrics

const express = require('express');
const { prisma, withRetry } = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/summary
// Calculate total distance, monthly fuel consumption, and vehicle-wise cost analytics
// ─────────────────────────────────────────────────────────────────────────────
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const user = await withRetry(() =>
      prisma.user.findUnique({
        where: { id: req.user.id },
        include: { organization: true }
      })
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const role = user.role;
    const org = user.organization;
    const fuelCostPerLitre = org?.fuelCostPerLitre || 100.0;
    const costPerKm = org?.costPerKm || 8.0;
    const co2PerKm = 0.12; // 120g CO2 per km

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const today = new Date();
    
    // Helper to generate last 6 months timeline chronologically
    const getTimeline = () => {
      const list = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        list.push({
          month: monthNames[d.getMonth()],
          year: d.getFullYear(),
          count: 0,
          spending: 0,
          earnings: 0,
          distance: 0,
          revenue: 0,
          fuelCost: 0,
          fuelConsumption: 0
        });
      }
      return list;
    };

    if (role === 'employee') {
      // 1. Fetch completed trips where user is driver or passenger
      const completedTrips = await withRetry(() =>
        prisma.trip.findMany({
          where: {
            status: { in: ['completed', 'payment_completed'] },
            OR: [
              { driverId: req.user.id },
              { passengers: { some: { userId: req.user.id } } }
            ]
          },
          include: {
            ride: true,
            vehicle: true,
            passengers: true
          }
        })
      );

      const totalRidesCompleted = completedTrips.length;
      const totalRidesOffered = await withRetry(() =>
        prisma.ride.count({ where: { driverId: req.user.id } })
      );
      const totalRidesBooked = await withRetry(() =>
        prisma.booking.count({ where: { passengerId: req.user.id } })
      );

      const driverTrips = completedTrips.filter(t => t.driverId === req.user.id);
      const passengerTrips = completedTrips.filter(t => t.passengers.some(p => p.userId === req.user.id));

      const driverDistance = driverTrips.reduce((acc, t) => acc + (t.ride?.distanceKm || 0), 0);
      const passengerDistance = passengerTrips.reduce((acc, t) => acc + (t.ride?.distanceKm || 0), 0);
      const totalDistance = driverDistance + passengerDistance;

      // Spent: transactions type 'payment' status 'completed'
      const spentTx = await withRetry(() =>
        prisma.transaction.aggregate({
          where: { userId: req.user.id, type: 'payment', status: 'completed' },
          _sum: { amount: true }
        })
      );
      const totalAmountSpent = spentTx._sum.amount || 0;

      // Earned: Completed trips as driver
      const totalAmountEarned = driverTrips.reduce((acc, t) => acc + t.fare, 0);

      // Fuel saved: passengerDistance * 0.08 L/km (12.5 km/L baseline)
      const fuelSavedLiters = passengerDistance * 0.08;
      const fuelSavedValue = fuelSavedLiters * fuelCostPerLitre;

      // CO2 saved: passengerDistance * 0.12 kg/km (120g/km baseline)
      const co2SavedKg = passengerDistance * co2PerKm;

      // Monthly trends timeline
      const monthlyTrends = getTimeline();
      completedTrips.forEach(t => {
        const date = t.completedAt || t.createdAt;
        const m = new Date(date).getMonth();
        const y = new Date(date).getFullYear();
        const trend = monthlyTrends.find(item => item.month === monthNames[m] && item.year === y);
        if (trend) {
          trend.count += 1;
          trend.distance += t.ride?.distanceKm || 0;
        }
      });

      // Get monthly spending from Transactions
      const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
      const txs = await withRetry(() =>
        prisma.transaction.findMany({
          where: {
            userId: req.user.id,
            status: 'completed',
            createdAt: { gte: sixMonthsAgo }
          }
        })
      );
      txs.forEach(tx => {
        const m = new Date(tx.createdAt).getMonth();
        const y = new Date(tx.createdAt).getFullYear();
        const trend = monthlyTrends.find(item => item.month === monthNames[m] && item.year === y);
        if (trend) {
          if (tx.type === 'payment') {
            trend.spending += tx.amount;
          } else if (tx.type === 'recharge' && tx.tripId) {
            trend.earnings += tx.amount;
          }
        }
      });

      // Ride status distribution
      const pendingCount = await withRetry(() => prisma.booking.count({ where: { passengerId: req.user.id, status: 'pending' } }));
      const confirmedCount = await withRetry(() => prisma.booking.count({ where: { passengerId: req.user.id, status: 'confirmed' } }));
      const cancelledCount = await withRetry(() => prisma.booking.count({ where: { passengerId: req.user.id, status: 'cancelled' } }));

      // Wallet transaction summary
      const txCounts = await withRetry(() =>
        prisma.transaction.groupBy({
          by: ['type'],
          where: { userId: req.user.id, status: 'completed' },
          _count: { id: true },
          _sum: { amount: true }
        })
      );
      const txSummary = {
        paymentCount: 0,
        paymentSum: 0,
        rechargeCount: 0,
        rechargeSum: 0,
        refundCount: 0,
        refundSum: 0
      };
      txCounts.forEach(item => {
        if (item.type === 'payment') {
          txSummary.paymentCount = item._count.id;
          txSummary.paymentSum = item._sum.amount || 0;
        } else if (item.type === 'recharge') {
          txSummary.rechargeCount = item._count.id;
          txSummary.rechargeSum = item._sum.amount || 0;
        } else if (item.type === 'refund') {
          txSummary.refundCount = item._count.id;
          txSummary.refundSum = item._sum.amount || 0;
        }
      });

      return res.status(200).json({
        role,
        totalRidesCompleted,
        totalRidesOffered,
        totalRidesBooked,
        totalDistance: Math.round(totalDistance),
        totalAmountSpent,
        totalAmountEarned,
        fuelSavedLiters: parseFloat(fuelSavedLiters.toFixed(2)),
        fuelSavedValue: Math.round(fuelSavedValue),
        co2SavedKg: parseFloat(co2SavedKg.toFixed(2)),
        monthlyTrends,
        statusDistribution: [
          { name: 'Completed', value: totalRidesCompleted },
          { name: 'Pending', value: pendingCount },
          { name: 'Confirmed', value: confirmedCount },
          { name: 'Cancelled', value: cancelledCount }
        ],
        walletSummary: txSummary
      });

    } else if (role === 'admin') {
      const organizationId = user.organizationId;

      // 1. Total employees in organization
      const totalEmployees = await withRetry(() =>
        prisma.user.count({ where: { organizationId, role: 'employee' } })
      );

      // 2. Registered Vehicles
      const totalVehicles = await withRetry(() =>
        prisma.vehicle.count({ where: { user: { organizationId } } })
      );

      // 3. Rides count
      const totalRides = await withRetry(() =>
        prisma.ride.count({ where: { driver: { organizationId } } })
      );
      const activeRides = await withRetry(() =>
        prisma.ride.count({
          where: {
            driver: { organizationId },
            status: { in: ['active', 'full'] }
          }
        })
      );

      // 4. Completed trips org-wide
      const completedTrips = await withRetry(() =>
        prisma.trip.findMany({
          where: {
            status: { in: ['completed', 'payment_completed'] },
            driver: { organizationId }
          },
          include: {
            ride: true,
            passengers: true,
            vehicle: true,
            driver: true
          }
        })
      );
      const totalCompletedRides = completedTrips.length;

      const totalDistance = completedTrips.reduce((acc, t) => acc + (t.ride?.distanceKm || 0), 0);
      const totalRevenue = completedTrips.reduce((acc, t) => acc + t.fare, 0);
      const totalTransportationCost = totalDistance * costPerKm;
      const avgRideDistance = completedTrips.length > 0 ? (totalDistance / completedTrips.length) : 0;

      // Fuel / CO2 saved org-wide: Sum of (tripDistance * passengersCount * 0.08)
      let totalFuelSavedLiters = 0;
      completedTrips.forEach(t => {
        const passengerCount = t.passengers.length;
        const dist = t.ride?.distanceKm || 0;
        totalFuelSavedLiters += dist * passengerCount * 0.08;
      });
      const totalFuelSavedValue = totalFuelSavedLiters * fuelCostPerLitre;
      const totalCo2SavedKg = totalFuelSavedLiters * 12.5 * co2PerKm;

      // Most active drivers: Group by driverId
      const driverCounts = {};
      completedTrips.forEach(t => {
        if (t.driver) {
          const dId = t.driver.id;
          if (!driverCounts[dId]) {
            driverCounts[dId] = { name: t.driver.name, email: t.driver.email, count: 0, distance: 0 };
          }
          driverCounts[dId].count += 1;
          driverCounts[dId].distance += t.ride?.distanceKm || 0;
        }
      });
      const mostActiveDrivers = Object.values(driverCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Most active passengers: Group TripPassenger counts
      const completedTripIds = completedTrips.map(t => t.id);
      const tripPassengers = await withRetry(() =>
        prisma.tripPassenger.findMany({
          where: { tripId: { in: completedTripIds } },
          include: { user: true, trip: { include: { ride: true } } }
        })
      );
      const passengerCounts = {};
      tripPassengers.forEach(tp => {
        const pId = tp.userId;
        if (!passengerCounts[pId]) {
          passengerCounts[pId] = { name: tp.user.name, email: tp.user.email, count: 0, distance: 0 };
        }
        passengerCounts[pId].count += 1;
        passengerCounts[pId].distance += tp.trip.ride?.distanceKm || 0;
      });
      const mostActivePassengers = Object.values(passengerCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Vehicle utilization
      const vehicleCounts = {};
      completedTrips.forEach(t => {
        if (t.vehicle) {
          const vId = t.vehicle.id;
          if (!vehicleCounts[vId]) {
            vehicleCounts[vId] = {
              vehicle: `${t.vehicle.model} (${t.vehicle.registrationNumber})`,
              trips: 0,
              distance: 0,
              revenue: 0
            };
          }
          vehicleCounts[vId].trips += 1;
          vehicleCounts[vId].distance += t.ride?.distanceKm || 0;
          vehicleCounts[vId].revenue += t.fare;
        }
      });
      const vehicleUtilization = Object.values(vehicleCounts)
        .map(v => {
          const fuelConsumed = v.distance * 0.08;
          const fuelCost = fuelConsumed * fuelCostPerLitre;
          const maintenance = v.distance * 1.5;
          const netProfit = v.revenue - (fuelCost + maintenance);
          return {
            vehicle: v.vehicle,
            distance: Math.round(v.distance),
            trips: v.trips,
            fuelCost: Math.round(fuelCost),
            maintenance: Math.round(maintenance),
            netProfit: Math.round(netProfit)
          };
        });

      // Monthly trends
      const monthlyTrends = getTimeline();
      completedTrips.forEach(t => {
        const date = t.completedAt || t.createdAt;
        const m = new Date(date).getMonth();
        const y = new Date(date).getFullYear();
        const trend = monthlyTrends.find(item => item.month === monthNames[m] && item.year === y);
        if (trend) {
          trend.count += 1;
          trend.revenue += t.fare;
          const dist = t.ride?.distanceKm || 0;
          trend.distance += dist;
          trend.fuelConsumption += dist * 0.08;
          trend.fuelCost += (dist * 0.08) * fuelCostPerLitre;
        }
      });

      return res.status(200).json({
        role,
        totalEmployees,
        totalRides,
        totalCompletedRides,
        activeRides,
        totalVehicles,
        totalRevenue,
        totalTransportationCost: Math.round(totalTransportationCost),
        avgRideDistance: parseFloat(avgRideDistance.toFixed(2)),
        fuelSavedLiters: parseFloat(totalFuelSavedLiters.toFixed(2)),
        fuelSavedValue: Math.round(totalFuelSavedValue),
        co2SavedKg: parseFloat(totalCo2SavedKg.toFixed(2)),
        mostActiveDrivers,
        mostActivePassengers,
        vehicleUtilization,
        monthlyTrends
      });
    }
  } catch (err) {
    console.error('[getReportsSummary]', err);
    return res.status(500).json({ message: 'Failed to compile reports summary.' });
  }
});

module.exports = router;
