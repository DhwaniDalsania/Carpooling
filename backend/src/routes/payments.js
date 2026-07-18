// src/routes/payments.js
// Router for handling Razorpay payment integrations and simulated card/UPI updates

const express = require('express');
const { prisma, withRetry } = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/create-order
// Initialize Razorpay order (or fallback mock order)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/create-order', requireAuth, async (req, res) => {
  const { tripId } = req.body;

  if (!tripId) {
    return res.status(400).json({ message: 'tripId is required to create order.' });
  }

  try {
    const trip = await withRetry(() => prisma.trip.findUnique({ where: { id: tripId } }));
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error('[createOrder] Razorpay credentials (RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET) are missing in environment.');
      return res.status(500).json({ message: 'Razorpay is not configured on the server. Missing Key ID or Key Secret.' });
    }

    console.info('[createOrder] Creating Razorpay order', { tripId, amount: trip.fare });

    // Check if real Razorpay mode is available
    if (keyId && keySecret) {
      try {
        const Razorpay = require('razorpay');
        const rzp = new Razorpay({
          key_id: keyId,
          key_secret: keySecret
        });

        // Razorpay expects amount in paise (1 INR = 100 Paise)
        const order = await rzp.orders.create({
          amount: Math.round(trip.fare * 100),
          currency: 'INR',
          receipt: `trp_${trip.id.slice(-12)}_${Date.now().toString().slice(-8)}`, // max 40 chars
          payment_capture: 1
        });

        return res.status(200).json({
          order_id: order.id,
          amount: order.amount,
          currency: order.currency,
          key_id: keyId
        });
      } catch (err) {
        const errMsg = err?.error?.description || err?.error?.code || err?.message || 'Unknown error';
        console.error('[createOrder] Razorpay order creation failed:', JSON.stringify(err));
        return res.status(502).json({ message: `Razorpay could not create a payment order: ${errMsg}. Please try again.` });
      }
    }

    // Fallback: Return simulated/mock order token (formatted with snake_case keys matching frontend)
    return res.status(200).json({
      order_id: 'order_mock_' + Math.random().toString(36).substring(7),
      amount: Math.round(trip.fare * 100),
      currency: 'INR',
      key_id: 'rzp_test_mockkey',
      isMock: true
    });
  } catch (err) {
    console.error('[createOrder] Unexpected error:', err);
    return res.status(500).json({ message: 'Failed to create payment order.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/verify
// Confirm Razorpay signature verification or process simulated payment
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify', requireAuth, async (req, res) => {
  const { tripId, razorpay_payment_id, razorpay_order_id, razorpay_signature, method = 'card' } = req.body;

  if (!tripId) {
    return res.status(400).json({ message: 'tripId is required for verification.' });
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

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Perform signature check if real keys exist and it's not a mock order
    if (keyId && keySecret && razorpay_signature && !razorpay_order_id.startsWith('order_mock_')) {
      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha256', keySecret);
      hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
      const generatedSignature = hmac.digest('hex');

      if (generatedSignature !== razorpay_signature) {
        return res.status(400).json({ message: 'Payment verification failed. Signature mismatch.' });
      }
    }

    // Process payment success (atomic operation):
    // Since payment is made via external Card/UPI, passenger wallet balance is untouched.
    // Driver gets credited the fare in their wallet.
    await withRetry(() =>
      prisma.$transaction([
        // 1. Credit driver wallet
        prisma.wallet.upsert({
          where: { userId: trip.driverId },
          update: { balance: { increment: trip.fare } },
          create: { userId: trip.driverId, balance: trip.fare }
        }),

        // 2. Create passenger payment transaction log
        prisma.transaction.create({
          data: {
            userId: req.user.id,
            tripId: trip.id,
            amount: trip.fare,
            type: 'payment',
            method: razorpay_order_id.startsWith('order_mock_') ? `simulated_${method}` : `razorpay_${method}`,
            status: 'completed'
          }
        }),

        // 3. Create driver earning transaction log
        prisma.transaction.create({
          data: {
            userId: trip.driverId,
            tripId: trip.id,
            amount: trip.fare,
            type: 'recharge',
            method: razorpay_order_id.startsWith('order_mock_') ? `simulated_${method}` : `razorpay_${method}`,
            status: 'completed'
          }
        }),

        // 4. Update trip status to payment_completed
        prisma.trip.update({
          where: { id: trip.id },
          data: { status: 'payment_completed' }
        })
      ])
    );

    return res.status(200).json({ message: 'Payment verified and completed successfully.' });
  } catch (err) {
    console.error('[verifyPayment]', err);
    return res.status(500).json({ message: 'Failed to complete payment verification.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/simulate
// ⚠️  SIMULATED GATEWAY — No real money moves. For demo/testing only.
// Marks the trip payment_completed after a 1.5s artificial delay,
// credits the driver's wallet, and logs a Transaction for both parties.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/simulate', requireAuth, async (req, res) => {
  const { tripId } = req.body;

  if (!tripId) {
    return res.status(400).json({ message: 'tripId is required.' });
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

    // Artificial gateway delay (1.5s) to simulate processing
    await new Promise((r) => setTimeout(r, 1500));

    await withRetry(() =>
      prisma.$transaction([
        // Credit driver wallet
        prisma.wallet.upsert({
          where: { userId: trip.driverId },
          update: { balance: { increment: trip.fare } },
          create: { userId: trip.driverId, balance: trip.fare }
        }),

        // Log passenger payment
        prisma.transaction.create({
          data: {
            userId: req.user.id,
            tripId: trip.id,
            amount: trip.fare,
            type: 'payment',
            method: 'simulated',
            status: 'completed'
          }
        }),

        // Log driver earning
        prisma.transaction.create({
          data: {
            userId: trip.driverId,
            tripId: trip.id,
            amount: trip.fare,
            type: 'recharge',
            method: 'simulated',
            status: 'completed'
          }
        }),

        // Mark trip as paid
        prisma.trip.update({
          where: { id: trip.id },
          data: { status: 'payment_completed' }
        })
      ])
    );

    return res.status(200).json({ message: '✅ [SIMULATED] Payment completed successfully.' });
  } catch (err) {
    console.error('[simulatePayment]', err);
    return res.status(500).json({ message: 'Failed to simulate payment.' });
  }
});

module.exports = router;
