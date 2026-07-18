// src/routes/wallet.js
// Router for user wallets and simulated fund recharges/payments

const express = require('express');
const { prisma, withRetry } = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wallet/mine  (alias: GET /api/wallet/balance)
// Fetch authenticated user's wallet balance and transaction logs
// ─────────────────────────────────────────────────────────────────────────────
router.get(['/mine', '/balance'], requireAuth, async (req, res) => {
  try {
    let wallet = await withRetry(() => prisma.wallet.findUnique({ where: { userId: req.user.id } }));
    
    // Auto-create wallet if missing (fail-safe)
    if (!wallet) {
      wallet = await withRetry(() => prisma.wallet.create({ data: { userId: req.user.id, balance: 500.0 } }));
    }

    const transactions = await withRetry(() =>
      prisma.transaction.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' }
      })
    );

    return res.status(200).json({
      balance: wallet.balance,
      transactions
    });
  } catch (err) {
    console.error('[getBalance]', err);
    return res.status(500).json({ message: 'Failed to retrieve wallet information.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/wallet/recharge
// Add funds to the authenticated user's wallet (simulated)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/recharge', requireAuth, async (req, res) => {
  const { amount } = req.body;
  const amountVal = parseFloat(amount);

  if (isNaN(amountVal) || amountVal <= 0) {
    return res.status(400).json({ message: 'Recharge amount must be greater than 0.' });
  }

  try {
    const [updatedWallet] = await withRetry(() =>
      prisma.$transaction([
        prisma.wallet.upsert({
          where: { userId: req.user.id },
          update: { balance: { increment: amountVal } },
          create: { userId: req.user.id, balance: amountVal }
        }),
        prisma.transaction.create({
          data: {
            userId: req.user.id,
            amount: amountVal,
            type: 'recharge',
            method: 'simulated',
            status: 'completed'
          }
        })
      ])
    );

    // Refresh context payload
    return res.status(200).json({
      message: 'Wallet recharged successfully!',
      balance: updatedWallet.balance
    });
  } catch (err) {
    console.error('[rechargeWallet]', err);
    return res.status(500).json({ message: 'Failed to recharge wallet.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/wallet/pay
// Process ride fare payment using user's wallet
// ─────────────────────────────────────────────────────────────────────────────
router.post('/pay', requireAuth, async (req, res) => {
  const { tripId } = req.body;

  if (!tripId) {
    return res.status(400).json({ message: 'tripId is required for payment.' });
  }

  try {
    const trip = await withRetry(() =>
      prisma.trip.findUnique({
        where: { id: tripId },
        include: { passengers: true }
      })
    );

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    if (trip.status !== 'payment_pending') {
      return res.status(400).json({ message: `Trip is not pending payment (status: ${trip.status}).` });
    }

    // Verify user is passenger on the trip
    const isPassenger = trip.passengers.some((p) => p.userId === req.user.id);
    if (!isPassenger) {
      return res.status(403).json({ message: 'Only passengers on this trip can make a payment.' });
    }

    // Verify wallet balance
    const wallet = await withRetry(() => prisma.wallet.findUnique({ where: { userId: req.user.id } }));
    if (!wallet || wallet.balance < trip.fare) {
      return res.status(400).json({ message: 'Insufficient wallet balance.' });
    }

    // Deduct passenger, credit driver, record transactions (atomic transaction)
    await withRetry(() =>
      prisma.$transaction([
        // 1. Deduct passenger wallet
        prisma.wallet.update({
          where: { userId: req.user.id },
          data: { balance: { decrement: trip.fare } }
        }),
        // 2. Credit driver wallet
        prisma.wallet.upsert({
          where: { userId: trip.driverId },
          update: { balance: { increment: trip.fare } },
          create: { userId: trip.driverId, balance: trip.fare }
        }),
        // 3. Create passenger payment transaction log
        prisma.transaction.create({
          data: {
            userId: req.user.id,
            tripId: trip.id,
            amount: trip.fare,
            type: 'payment',
            method: 'wallet',
            status: 'completed'
          }
        }),
        // 4. Create driver earning transaction log
        prisma.transaction.create({
          data: {
            userId: trip.driverId,
            tripId: trip.id,
            amount: trip.fare,
            type: 'recharge',
            method: 'wallet',
            status: 'completed'
          }
        }),
        // 5. Set trip status to payment_completed
        prisma.trip.update({
          where: { id: trip.id },
          data: { status: 'payment_completed' }
        })
      ])
    );

    return res.status(200).json({ message: 'Fare payment completed successfully via Wallet.' });
  } catch (err) {
    console.error('[walletPay]', err);
    return res.status(500).json({ message: 'Failed to process wallet payment.' });
  }
});

module.exports = router;
