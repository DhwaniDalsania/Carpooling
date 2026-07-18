// src/routes/routes.js
// Router for proxying route calculation queries to the OSRM public API

const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/routes/calculate
// Proxies route query to public OSRM API
// Body: { pickup: { lat, lng }, destination: { lat, lng } }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/calculate', requireAuth, async (req, res) => {
  const { pickup, destination } = req.body;

  if (!pickup || pickup.lat === undefined || pickup.lng === undefined) {
    return res.status(400).json({ message: 'pickup with lat and lng coordinates is required.' });
  }

  if (!destination || destination.lat === undefined || destination.lng === undefined) {
    return res.status(400).json({ message: 'destination with lat and lng coordinates is required.' });
  }

  const pLat = parseFloat(pickup.lat);
  const pLng = parseFloat(pickup.lng);
  const dLat = parseFloat(destination.lat);
  const dLng = parseFloat(destination.lng);

  if (isNaN(pLat) || isNaN(pLng) || isNaN(dLat) || isNaN(dLng)) {
    return res.status(400).json({ message: 'Pickup and Destination coordinates must be valid numbers.' });
  }

  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pLng},${pLat};${dLng},${dLat}?overview=full&geometries=geojson`;
    
    const osrmResponse = await fetch(osrmUrl, {
      headers: {
        'User-Agent': 'EnterpriseCarpoolingHackathon/1.0 (dhwanidalsania@example.com)'
      }
    });

    if (!osrmResponse.ok) {
      throw new Error(`OSRM API returned status ${osrmResponse.status}`);
    }

    const data = await osrmResponse.json();

    if (!data.routes || data.routes.length === 0) {
      return res.status(400).json({ message: 'Route calculation failed. No routes found.' });
    }

    const route = data.routes[0];
    const distanceKm = parseFloat((route.distance / 1000).toFixed(1));
    const durationMinutes = Math.round(route.duration / 60);
    const routeGeometry = route.geometry;

    return res.status(200).json({
      distanceKm,
      durationMinutes,
      routeGeometry
    });
  } catch (err) {
    console.error('[calculateRoute]', err);
    return res.status(500).json({ message: 'Failed to calculate route via OSRM.' });
  }
});

module.exports = router;
