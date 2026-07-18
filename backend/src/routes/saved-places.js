const express = require('express');
const { prisma, withRetry } = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware
router.use(requireAuth);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/saved-places
// List all saved places of the user
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const places = await withRetry(() =>
      prisma.savedPlace.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' }
      })
    );

    return res.status(200).json(places);
  } catch (err) {
    console.error('[getSavedPlaces]', err);
    return res.status(500).json({ message: 'Failed to fetch saved places.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/saved-places
// Create a new saved place
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { label, address, lat, lng } = req.body;

  if (!label || !address || lat === undefined || lng === undefined) {
    return res.status(400).json({ message: 'Label, address, lat, and lng are required.' });
  }

  try {
    const newPlace = await withRetry(() =>
      prisma.savedPlace.create({
        data: {
          userId: req.user.id,
          label,
          address,
          lat: parseFloat(lat),
          lng: parseFloat(lng)
        }
      })
    );

    return res.status(201).json(newPlace);
  } catch (err) {
    console.error('[createSavedPlace]', err);
    return res.status(500).json({ message: 'Failed to create saved place.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/saved-places/:id
// Update an existing saved place
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { label, address, lat, lng } = req.body;

  try {
    const place = await withRetry(() => prisma.savedPlace.findUnique({ where: { id } }));
    if (!place) {
      return res.status(404).json({ message: 'Saved place not found.' });
    }

    if (place.userId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized.' });
    }

    const updated = await withRetry(() =>
      prisma.savedPlace.update({
        where: { id },
        data: {
          label: label !== undefined ? label : undefined,
          address: address !== undefined ? address : undefined,
          lat: lat !== undefined ? parseFloat(lat) : undefined,
          lng: lng !== undefined ? parseFloat(lng) : undefined
        }
      })
    );

    return res.status(200).json(updated);
  } catch (err) {
    console.error('[updateSavedPlace]', err);
    return res.status(500).json({ message: 'Failed to update saved place.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/saved-places/:id
// Delete a saved place
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const place = await withRetry(() => prisma.savedPlace.findUnique({ where: { id } }));
    if (!place) {
      return res.status(404).json({ message: 'Saved place not found.' });
    }

    if (place.userId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized.' });
    }

    await withRetry(() => prisma.savedPlace.delete({ where: { id } }));

    return res.status(200).json({ message: 'Saved place deleted successfully.' });
  } catch (err) {
    console.error('[deleteSavedPlace]', err);
    return res.status(500).json({ message: 'Failed to delete saved place.' });
  }
});

module.exports = router;
