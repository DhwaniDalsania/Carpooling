import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Clock, MapPin, Check, Loader2, Compass, ChevronDown, Plus, Trash2, Navigation } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import Header from './Header';
import Sidebar from './Sidebar';

// Custom Leaflet Icons
const startIcon = L.divIcon({
  html: `<div style="background-color: #3b82f6; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4);"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
  className: 'custom-leaflet-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 30]
});

const destIcon = L.divIcon({
  html: `<div style="background-color: #0d9488; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4);"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
  className: 'custom-leaflet-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 30]
});

const stopIcon = L.divIcon({
  html: `<div style="background-color: #f59e0b; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4); font-size: 10px; font-weight: 700;">S</div>`,
  className: 'custom-leaflet-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// Helper component to auto-pan and zoom map container to fit path bounds
function MapRecenter({ startCoords, destCoords, stopCoords }) {
  const map = useMap();
  useEffect(() => {
    const allPoints = [startCoords, destCoords, ...stopCoords].filter(Boolean);
    if (allPoints.length >= 2) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (allPoints.length === 1) {
      map.setView(allPoints[0], 13);
    }
  }, [startCoords, destCoords, stopCoords, map]);
  return null;
}

export const RouteConfirmation = ({ routeState, onBack, onProfileClick, onNavigate }) => {
  const { user, token } = useAuth();
  
  const [currentHeaderTab, setCurrentHeaderTab] = useState('dashboard');
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Geocoding and OSRM states
  const [startCoords, setStartCoords] = useState(
    routeState?.pickupLat && routeState?.pickupLng ? [routeState.pickupLat, routeState.pickupLng] : null
  );
  const [destCoords, setDestCoords] = useState(
    routeState?.destLat && routeState?.destLng ? [routeState.destLat, routeState.destLng] : null
  );
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [routePath, setRoutePath] = useState([]);
  const [routeGeoJson, setRouteGeoJson] = useState(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Stops state: array of { address, lat, lng } — driver only
  const [stops, setStops] = useState([]);
  const [stopCoords, setStopCoords] = useState([]); // resolved [lat, lng] per stop
  const [stopInput, setStopInput] = useState('');
  const [isGeocodingStop, setIsGeocodingStop] = useState(false);
  const [legsBreakdown, setLegsBreakdown] = useState([]); // per-leg distances

  // Editable Driver Fare per Seat
  const [driverFare, setDriverFare] = useState(0);

  // Fallbacks if data is missing
  const pickup = routeState?.pickupLocation || '';
  const destination = routeState?.destination || '';
  const rideType = routeState?.type || 'find';

  // Initialize and update driver fare whenever distance resolves
  useEffect(() => {
    if (distance > 0 && rideType === 'offer') {
      const travelCost = user?.organization?.travelCostPerKm || 12.0;
      // Add +10% fare surcharge for every stop added (incentive for drivers)
      const stopSurcharge = 1 + (stops.length * 0.10);
      const computedEst = (distance * travelCost * stopSurcharge) / (parseInt(routeState?.seats, 10) || 1);
      setDriverFare(Math.max(1, Math.round(computedEst)));
    }
  }, [distance, user, routeState, rideType, stops.length]);

  const getScheduleText = () => {
    if (rideType === 'find') {
      if (routeState?.date && routeState?.time) return `${routeState.date} at ${routeState.time}`;
      return 'Pick up now';
    } else {
      if (routeState?.dateTime) return new Date(routeState.dateTime).toLocaleString();
      return 'Pick up now';
    }
  };

  // Build OSRM URL from all waypoints (pickup + stops + dest)
  const buildOsrmUrl = (pCoords, dCoords, stopsList) => {
    const userAgentHeader = {
      'User-Agent': 'EnterpriseCarpoolingHackathon/1.0 (dhwanidalsania@example.com)'
    };
    const waypoints = [
      `${pCoords[1]},${pCoords[0]}`,
      ...stopsList.map(s => `${s[1]},${s[0]}`),
      `${dCoords[1]},${dCoords[0]}`
    ].join(';');
    return {
      url: `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`,
      headers: userAgentHeader
    };
  };

  // Perform OSRM route calculations (runs when pickup/destination/stops change)
  const calculateRoute = async (pCoords, dCoords, resolvedStops) => {
    if (!pCoords || !dCoords) return;
    setIsGeocoding(true);
    setErrorMsg('');

    try {
      const { url, headers } = buildOsrmUrl(pCoords, dCoords, resolvedStops || stopCoords);
      const oResponse = await fetch(url, { headers });
      const oData = await oResponse.json();

      if (!oData || !oData.routes || oData.routes.length === 0) {
        throw new Error('OSRM Route calculation failed. Check network access.');
      }

      const route = oData.routes[0];
      setDistance(parseFloat((route.distance / 1000).toFixed(1)));
      setDuration(Math.round(route.duration / 60));
      setRouteGeoJson(route.geometry);
      const coords = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
      setRoutePath(coords);

      // Store per-leg breakdown for fare transparency
      if (route.legs) {
        setLegsBreakdown(route.legs.map((leg, i) => ({
          index: i,
          distanceKm: parseFloat((leg.distance / 1000).toFixed(1)),
          durationMinutes: Math.round(leg.duration / 60)
        })));
      }
    } catch (err) {
      console.error('[Geocode/Route Error]', err);
      setErrorMsg(err.message || 'An error occurred during geocoding.');
    } finally {
      setIsGeocoding(false);
    }
  };

  // Initial geocoding run on mount
  useEffect(() => {
    const run = async () => {
      if (!pickup || !destination) {
        setErrorMsg('Pickup and destination locations are missing.');
        return;
      }

      const userAgentHeader = { 'User-Agent': 'EnterpriseCarpoolingHackathon/1.0 (dhwanidalsania@example.com)' };
      let pCoords = startCoords;
      let dCoords = destCoords;

      setIsGeocoding(true);
      try {
        if (!pCoords) {
          const pRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(pickup)}`, { headers: userAgentHeader });
          const pData = await pRes.json();
          if (!pData || pData.length === 0) throw new Error(`Could not find coordinate for pickup: "${pickup}".`);
          pCoords = [parseFloat(pData[0].lat), parseFloat(pData[0].lon)];
          setStartCoords(pCoords);
        }
        if (!dCoords) {
          const dRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(destination)}`, { headers: userAgentHeader });
          const dData = await dRes.json();
          if (!dData || dData.length === 0) throw new Error(`Could not find coordinate for destination: "${destination}".`);
          dCoords = [parseFloat(dData[0].lat), parseFloat(dData[0].lon)];
          setDestCoords(dCoords);
        }
        await calculateRoute(pCoords, dCoords, []);
      } catch (err) {
        console.error('[Geocode/Route Error]', err);
        setErrorMsg(err.message || 'An error occurred during geocoding.');
        setIsGeocoding(false);
      }
    };
    run();
  }, [pickup, destination]);

  // Geocode and add a stop
  const handleAddStop = async () => {
    if (!stopInput.trim()) return;
    setIsGeocodingStop(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(stopInput)}`,
        { headers: { 'User-Agent': 'EnterpriseCarpoolingHackathon/1.0 (dhwanidalsania@example.com)' } }
      );
      const data = await res.json();
      if (!data || data.length === 0) throw new Error(`Could not find location: "${stopInput}"`);
      const coord = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      const newStop = { address: stopInput, lat: coord[0], lng: coord[1] };
      const newStops = [...stops, newStop];
      const newCoords = [...stopCoords, coord];
      setStops(newStops);
      setStopCoords(newCoords);
      setStopInput('');
      // Recalculate route with new stop
      await calculateRoute(startCoords, destCoords, newCoords);
    } catch (err) {
      alert(err.message || 'Could not geocode stop location.');
    } finally {
      setIsGeocodingStop(false);
    }
  };

  // Remove a stop
  const handleRemoveStop = async (idx) => {
    const newStops = stops.filter((_, i) => i !== idx);
    const newCoords = stopCoords.filter((_, i) => i !== idx);
    setStops(newStops);
    setStopCoords(newCoords);
    await calculateRoute(startCoords, destCoords, newCoords);
  };

  // Total fare with stops
  const getTotalFareDisplay = () => {
    if (rideType === 'find') {
      const travelCost = user?.organization?.travelCostPerKm || 12.0;
      return Math.max(1, Math.round((distance * travelCost) / (parseInt(routeState?.seats, 10) || 1)));
    }
    return driverFare * (parseInt(routeState?.seats, 10) || 1);
  };

  const handleConfirm = async () => {
    if (!startCoords || !destCoords) {
      alert('Cannot confirm: Coordinates are not resolved yet.');
      return;
    }

    if (rideType === 'offer') {
      if (isNaN(driverFare) || driverFare <= 0) {
        alert('Driver fare must be greater than 0.');
        return;
      }
      const travelCost = user?.organization?.travelCostPerKm || 12.0;
      const baseEst = (distance * travelCost) / (parseInt(routeState?.seats, 10) || 1);
      if (driverFare > Math.max(1, Math.round(baseEst)) * 8) {
        alert('Driver fare is unreasonably high. Please decrease it.');
        return;
      }
    }

    setIsConfirming(true);
    setErrorMsg('');

    try {
      if (rideType === 'offer') {
        const response = await fetch('/api/rides', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            pickupAddress: pickup,
            pickupLat: startCoords[0],
            pickupLng: startCoords[1],
            destAddress: destination,
            destLat: destCoords[0],
            destLng: destCoords[1],
            datetime: routeState.dateTime,
            availableSeats: parseInt(routeState.seats, 10),
            farePerSeat: driverFare,
            vehicleId: routeState.vehicleId || 'v1',
            routeGeoJson: routeGeoJson,
            distanceKm: distance,
            stops: stops.length > 0 ? stops : undefined
          })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to post ride offer.');

        setConfirmSuccess(true);
        setTimeout(() => {
          setConfirmSuccess(false);
          onNavigate('dashboard', { activeTab: 'trips' });
        }, 1500);

      } else {
        const response = await fetch(
          `/api/rides/search?pickupLat=${startCoords[0]}&pickupLng=${startCoords[1]}&destLat=${destCoords[0]}&destLng=${destCoords[1]}&seats=${routeState.seats}&date=${routeState.date}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        const matchingRides = await response.json();
        if (!response.ok) throw new Error(matchingRides.message || 'Search request failed.');

        onNavigate('available-rides', {
          rides: matchingRides,
          searchQuery: {
            pickup,
            destination,
            pickupLat: startCoords[0],
            pickupLng: startCoords[1],
            destLat: destCoords[0],
            destLng: destCoords[1],
            seats: routeState.seats,
            date: routeState.date,
            time: routeState.time
          }
        });
      }

    } catch (err) {
      console.error('[confirmRouteError]', err);
      setErrorMsg(err.message || 'Failed to confirm route. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="app-container animate-fade-in">
      <Header
        onProfileClick={onProfileClick}
        currentTab={currentHeaderTab}
        setCurrentTab={(tabId) => onNavigate('dashboard', { activeTab: tabId })}
        showTabs={true}
      />

      <div className="app-body-wrapper">
        <Sidebar label="Carpooling" />

        <main className="app-content-area">
          <div className="dashboard-container" style={{ maxWidth: '1060px', padding: '0px', overflow: 'hidden' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', minHeight: '580px' }}>
              
              {/* Left Form Panel */}
              <div style={{ padding: '28px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflowY: 'auto', maxHeight: '620px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  <button className="back-header" onClick={onBack} style={{ marginBottom: '8px' }}>
                    <ArrowLeft size={16} />
                    <span>Trip</span>
                  </button>

                  {errorMsg && (
                    <div className="feedback-alert feedback-error">
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Start Location */}
                  <div className="form-group">
                    <label className="form-label">Start Location</label>
                    <div className="input-icon-wrapper">
                      <div className="input-icon-left">
                        {isGeocoding ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                      </div>
                      <input type="text" className="input-field" value={pickup} readOnly style={{ cursor: 'default' }} />
                    </div>
                  </div>

                  {/* ── Intermediate Stops Card — Driver Only ────────────────── */}
                  {rideType === 'offer' && (
                    <div style={{ backgroundColor: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '16px' }}>
                      
                      {/* Section header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Navigation size={15} style={{ color: 'var(--color-brand)' }} />
                          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Add Stops Along the Way</span>
                        </div>
                        {stops.length > 0 && (
                          <span style={{ fontSize: '10px', backgroundColor: 'rgba(245,158,11,0.2)', color: '#f59e0b', padding: '3px 8px', borderRadius: '20px', fontWeight: '700' }}>
                            +{stops.length * 10}% fare surcharge
                          </span>
                        )}
                      </div>

                      {/* Route visualizer: Pickup → Stop 1 → Stop 2 → Dest */}
                      <div style={{ position: 'relative', marginBottom: '12px' }}>
                        {/* Pickup dot */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#3b82f6', flexShrink: 0 }} />
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pickup}</span>
                        </div>
                        {/* Connector + Stops */}
                        {stops.map((stop, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', marginLeft: '1px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                              <div style={{ width: '1px', height: '10px', backgroundColor: '#f59e0b', opacity: 0.5 }} />
                              <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#f59e0b', color: 'white', fontSize: '9px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{idx + 1}</div>
                              <div style={{ width: '1px', height: '10px', backgroundColor: '#f59e0b', opacity: 0.5 }} />
                            </div>
                            <span style={{ flex: 1, fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stop.address}</span>
                            {legsBreakdown[idx] && (
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>{legsBreakdown[idx].distanceKm} km</span>
                            )}
                            <button onClick={() => handleRemoveStop(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px', flexShrink: 0, lineHeight: 1 }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                        {/* Destination dot */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#0d9488', flexShrink: 0 }} />
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{destination}</span>
                        </div>
                      </div>

                      {/* Add stop input */}
                      {stops.length < 4 ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <div style={{ position: 'relative', flex: 1 }}>
                            <input
                              type="text"
                              className="input-field"
                              style={{ paddingLeft: '12px', width: '100%', fontSize: '12px', height: '40px' }}
                              placeholder="Type a stop address & press Enter…"
                              value={stopInput}
                              onChange={e => setStopInput(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleAddStop()}
                            />
                          </div>
                          <button
                            className="btn btn-primary"
                            style={{ height: '40px', width: '40px', padding: 0, flexShrink: 0, minWidth: '40px' }}
                            onClick={handleAddStop}
                            disabled={isGeocodingStop || !stopInput.trim()}
                            title="Add stop"
                          >
                            {isGeocodingStop ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                          </button>
                        </div>
                      ) : (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>Maximum 4 stops reached</div>
                      )}

                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>💡</span>
                        <span>Each stop adds +10% to the per-seat fare. Up to 4 stops allowed.</span>
                      </div>
                    </div>
                  )}

                  {/* Destination Location */}
                  <div className="form-group">
                    <label className="form-label">Destination Location</label>
                    <div className="input-icon-wrapper">
                      <div className="input-icon-left">
                        {isGeocoding ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                      </div>
                      <input type="text" className="input-field" value={destination} readOnly style={{ cursor: 'default' }} />
                    </div>
                  </div>

                  {/* Pickup Schedule */}
                  <div className="form-group">
                    <label className="form-label">Pickup Schedule</label>
                    <div className="input-icon-wrapper seat-select-wrapper">
                      <div className="input-icon-left"><Clock size={18} /></div>
                      <select className="input-field seat-select" disabled style={{ opacity: 1, cursor: 'default' }}>
                        <option>{getScheduleText()}</option>
                      </select>
                      <ChevronDown size={18} className="select-arrow-icon" />
                    </div>
                  </div>

                  {/* Driver Fare Input */}
                  {rideType === 'offer' && (
                    <div className="form-group" style={{ marginTop: '8px' }}>
                      <label className="form-label">Driver Fare (₹ per seat)</label>
                      <div className="input-icon-wrapper">
                        <div className="input-icon-left" style={{ fontWeight: '700', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px' }}>
                          ₹
                        </div>
                        <input
                          type="number"
                          className="input-field"
                          style={{ paddingLeft: '32px' }}
                          value={driverFare}
                          onChange={(e) => setDriverFare(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          required
                        />
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                        Auto-calculated from distance{stops.length > 0 ? ` + ${stops.length * 10}% stop surcharge` : ''}. Adjust as needed.
                      </span>
                    </div>
                  )}

                </div>

                {/* Confirm Button */}
                <div style={{ marginTop: '20px' }}>
                  {confirmSuccess ? (
                    <div className="feedback-alert feedback-success" style={{ justifyContent: 'center', height: '52px' }}>
                      <Check size={18} />
                      <span>{rideType === 'find' ? 'Ride Search Confirmed!' : 'Ride Offer Created!'}</span>
                    </div>
                  ) : (
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                      onClick={handleConfirm}
                      disabled={isConfirming || isGeocoding || !startCoords || !destCoords}
                    >
                      {isConfirming ? (
                        <>
                          <Loader2 className="animate-spin" size={18} />
                          <span>Confirming route...</span>
                        </>
                      ) : (
                        <span>Confirm Route</span>
                      )}
                    </button>
                  )}
                </div>

              </div>

              {/* Right Map Panel */}
              <div style={{ backgroundColor: '#090d16', padding: '24px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                
                {/* Stats bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'rgba(21, 28, 44, 0.85)', border: '1px solid var(--border-color)', padding: '14px 20px', borderRadius: '12px', zIndex: 1000, backdropFilter: 'blur(4px)', marginBottom: '16px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Distance</span>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{distance ? `${distance} km` : '--'}</div>
                  </div>
                  <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '20px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Duration</span>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{duration ? `${duration} mins` : '--'}</div>
                  </div>
                  <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '20px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      {rideType === 'find' ? 'Est. Fare' : 'Total Fare'}
                    </span>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-brand)' }}>
                      ₹ {getTotalFareDisplay()}
                    </div>
                  </div>
                  {stops.length > 0 && (
                    <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '20px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Stops</span>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#f59e0b' }}>{stops.length}</div>
                    </div>
                  )}
                </div>

                {/* Map */}
                <div style={{ flex: 1, position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', zIndex: 1 }}>
                  <MapContainer
                    center={startCoords || [23.0225, 72.5714]}
                    zoom={12}
                    style={{ width: '100%', height: '100%' }}
                    zoomControl={true}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      className="osm-tiles"
                    />

                    {startCoords && <Marker position={startCoords} icon={startIcon} />}
                    {destCoords && <Marker position={destCoords} icon={destIcon} />}

                    {/* Stop markers */}
                    {stopCoords.map((coord, idx) => (
                      <Marker key={`stop-${idx}`} position={coord} icon={stopIcon} />
                    ))}

                    {routePath.length > 0 && (
                      <Polyline
                        positions={routePath}
                        color="#0d9488"
                        weight={5}
                        opacity={0.8}
                        dashArray="10, 5"
                      />
                    )}

                    <MapRecenter startCoords={startCoords} destCoords={destCoords} stopCoords={stopCoords} />
                  </MapContainer>
                </div>

              </div>

            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

export default RouteConfirmation;
