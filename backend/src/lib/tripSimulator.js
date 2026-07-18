// src/lib/tripSimulator.js
// Server-side simulator to emit GPS coordinates along a route over a fixed duration.

// Map to hold the last known active locations for fallback lookups
// Key: tripId, Value: { lat, lng, etaMinutes }
const activeLocations = new Map();
const activeIntervals = new Map();

/**
 * Start simulating a trip journey.
 * Walks over the route coordinates array over a target ~90 seconds.
 * 
 * @param {string} tripId The Trip ID
 * @param {object} routeGeoJson GeoJSON LineString object from OSRM
 * @param {object} trackingNs Socket.io namespace to broadcast updates to
 */
function startSimulation(tripId, routeGeoJson, trackingNs) {
  if (activeIntervals.has(tripId)) {
    return; // Already running
  }

  if (!routeGeoJson || !routeGeoJson.coordinates || routeGeoJson.coordinates.length === 0) {
    console.error(`[tripSimulator] Invalid or missing routeGeoJson for trip ${tripId}`);
    return;
  }

  // OSRM provides coordinates as [lng, lat]
  const coordinates = routeGeoJson.coordinates;
  const totalPoints = coordinates.length;
  
  // We want to simulate the journey over ~90 seconds (fixed demo duration)
  // We'll emit updates every 3 seconds (3000ms)
  const TICK_MS = 3000;
  const TARGET_TOTAL_MS = 90000;
  const totalTicks = Math.floor(TARGET_TOTAL_MS / TICK_MS); // 30 ticks
  
  // Calculate how many points we must step forward each tick to finish in 30 ticks
  const stepSize = Math.max(1, Math.ceil(totalPoints / totalTicks));

  let currentIndex = 0;
  let etaMinutes = Math.ceil(TARGET_TOTAL_MS / 60000); // 2 mins initially

  const interval = setInterval(() => {
    // If we've reached the end
    if (currentIndex >= totalPoints) {
      stopSimulation(tripId);
      // Emit final arrival event
      trackingNs.to(`trip:${tripId}`).emit('location:arrived', { tripId });
      return;
    }

    const [lng, lat] = coordinates[currentIndex];

    // Update in-memory state for fallback REST API
    const locationData = { tripId, lat, lng, etaMinutes };
    activeLocations.set(tripId, locationData);

    // Emit live update to the trip's socket room
    trackingNs.to(`trip:${tripId}`).emit('location:update', locationData);

    // Prepare for next tick
    currentIndex += stepSize;
    // Cap index at final point to ensure we end cleanly exactly on destination
    if (currentIndex >= totalPoints && currentIndex - stepSize < totalPoints - 1) {
      currentIndex = totalPoints - 1; 
    }

    // Decrement ETA slightly for realism (90s = 1.5m)
    const remainingTicks = Math.ceil((totalPoints - currentIndex) / stepSize);
    etaMinutes = Math.max(0, Math.ceil((remainingTicks * TICK_MS) / 60000));
  }, TICK_MS);

  activeIntervals.set(tripId, interval);
  console.log(`[tripSimulator] Started for trip ${tripId} (Points: ${totalPoints}, Step: ${stepSize})`);
}

/**
 * Stop simulating a trip.
 * 
 * @param {string} tripId The Trip ID
 */
function stopSimulation(tripId) {
  if (activeIntervals.has(tripId)) {
    clearInterval(activeIntervals.get(tripId));
    activeIntervals.delete(tripId);
    activeLocations.delete(tripId);
    console.log(`[tripSimulator] Stopped for trip ${tripId}`);
  }
}

module.exports = {
  activeLocations,
  startSimulation,
  stopSimulation
};
