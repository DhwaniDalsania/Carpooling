// src/routes/user.js
// Router for user profile endpoints

const express = require('express');
const { prisma, withRetry } = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── Helper: safe user shape (no passwordHash) ─────────────────────────────────
function safeUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/user/profile
// Body: { name, photo }
// Headers: Authorization: Bearer <token>
// ─────────────────────────────────────────────────────────────────────────────
router.put('/profile', requireAuth, async (req, res) => {
  const { name, photo } = req.body;

  try {
    // Update user properties in Postgres via Prisma
    const updatedUser = await withRetry(() =>
      prisma.user.update({
        where: { id: req.user.id },
        data: {
          name: name !== undefined ? name : undefined,
          photoUrl: photo !== undefined ? photo : undefined,
        },
        include: { organization: true },
      })
    );

    return res.status(200).json({
      message: 'Profile updated successfully!',
      user: safeUser(updatedUser),
    });
  } catch (err) {
    console.error('[updateProfile]', err);
    return res.status(500).json({
      message: 'Failed to update profile. Please try again.',
    });
  }
});

module.exports = router;
