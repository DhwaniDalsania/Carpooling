import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, Clock, MapPin, Loader2, Users, Car, Navigation, Wifi, WifiOff } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { io } from 'socket.io-client';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

// ── Custom Leaflet Icons ──────────────────────────────────────────────────────

const startIcon = L.divIcon({
  html: `<div style="background-color:#3b82f6;color:white;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
  className: 'custom-leaflet-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 30]
});

const destIcon = L.divIcon({
  html: `<div style="background-color:#0d9488;color:white;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
  className: 'custom-leaflet-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 30]
});

// Animated car SVG icon — rotates to face direction of travel
const makeCarIcon = (rotation = 0) => L.divIcon({
  html: `<div style="transform:rotate(${rotation}deg);transition:transform 0.5s ease;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.5))">
    <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="24" fill="#f59e0b" opacity="0.18"/>
      <circle cx="24" cy="24" r="19" fill="#f59e0b"/>
      <g transform="translate(10,10)" fill="white">
        <path d="M22 11h-1.5L18 6H6L3.5 11H2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h1v3a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h12v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-3h1a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1zm-18.5 0L5 8h14l1.5 3H3.5zm1 5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0zm13 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0z"/>
      </g>
    </svg>
  </div>`,
  className: 'car-marker-icon',
  iconSize: [38, 38],
  iconAnchor: [19, 19]
});

// Pulse ring around car position
const pulseIcon = L.divIcon({
  html: `<div style="width:60px;height:60px;border-radius:50%;border:3px solid rgba(245,158,11,0.4);animation:pulse 1.5s ease-in-out infinite;background:rgba(245,158,11,0.08)"></div>`,
  className: 'car-pulse-icon',
  iconSize: [60, 60],
  iconAnchor: [30, 30]
});

// ── Map auto-pan helper ───────────────────────────────────────────────────────

function MapRecenter({ carPosition, startCoords, destCoords, isTracking }) {
  const map = useMap();
  useEffect(() => {
    if (isTracking && carPosition) {
      map.panTo(carPosition, { animate: true, duration: 0.8 });
    } else if (startCoords && destCoords) {
      map.fitBounds(L.latLngBounds([startCoords, destCoords]), { padding: [50, 50] });
    }
  }, [carPosition, startCoords, destCoords, isTracking, map]);
  return null;
}

// ── Bearing calculation for car rotation ─────────────────────────────────────

function getBearing(prev, next) {
  if (!prev || !next) return 0;
  const lat1 = (prev[0] * Math.PI) / 180;
  const lat2 = (next[0] * Math.PI) / 180;
  const dLng = ((next[1] - prev[1]) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// ── Main Component ────────────────────────────────────────────────────────────

export const TrackRide = ({ routeState, onBack, onProfileClick, onNavigate }) => {
  const { token } = useAuth();
  
  const [currentHeaderTab] = useState('dashboard');
  const [errorMsg, setErrorMsg] = useState('');

  // Geocoding and route states
  const [startCoords, setStartCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [routePath, setRoutePath] = useState([]);

  // Live tracking states
  const [carPosition, setCarPosition] = useState(null); // [lat, lng]
  const [carRotation, setCarRotation] = useState(0);
  const [prevCarPosition, setPrevCarPosition] = useState(null);
  const [etaMinutes, setEtaMinutes] = useState(null);
  const [isLive, setIsLive] = useState(false);          // Socket connected & receiving
  const [arrived, setArrived] = useState(false);
  const [isFollowing, setIsFollowing] = useState(true); // Camera follows car
  
  // Fallback: local animation when socket not emitting
  const [localPathIndex, setLocalPathIndex] = useState(0);
  const socketRef = useRef(null);
  const animIntervalRef = useRef(null);

  // Extract trip detail parameters
  const tripId = routeState?.tripId;
  const pickup = routeState?.pickupLocation || '';
  const destination = routeState?.destination || '';
  const driverName = routeState?.driverName || 'Driver';
  const vehicleName = routeState?.vehicleName || 'Vehicle';
  const vehicleReg = routeState?.vehicleReg || '';
  const tripStatus = routeState?.tripStatus || 'booked';

  const pickupLat = routeState?.pickupLat;
  const pickupLng = routeState?.pickupLng;
  const destLat = routeState?.destLat;
  const destLng = routeState?.destLng;
  const stops = routeState?.stops;

  const stopsList = (() => {
    if (!stops) return [];
    if (typeof stops === 'string') {
      try {
        return JSON.parse(stops);
      } catch (err) {
        console.error('[TrackRide] Error parsing stops string:', err);
        return [];
      }
    }
    return Array.isArray(stops) ? stops : [];
  })();

  // Geocoding & OSRM on mount
  useEffect(() => {
    const calculateRoute = async () => {
      if (!pickup || !destination) return;
      setErrorMsg('');
      try {
        const UA = { 'User-Agent': 'EnterpriseCarpoolingHackathon/1.0 (dhwanidalsania@example.com)' };

        let pCoords = null;
        if (pickupLat !== undefined && pickupLng !== undefined && pickupLat !== null && pickupLng !== null) {
          pCoords = [parseFloat(pickupLat), parseFloat(pickupLng)];
        } else {
          const pRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(pickup)}`, { headers: UA });
          const pData = await pRes.json();
          if (!pData?.length) throw new Error('Could not resolve pickup location.');
          pCoords = [parseFloat(pData[0].lat), parseFloat(pData[0].lon)];
        }
        setStartCoords(pCoords);

        let dCoords = null;
        if (destLat !== undefined && destLng !== undefined && destLat !== null && destLng !== null) {
          dCoords = [parseFloat(destLat), parseFloat(destLng)];
        } else {
          const dRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(destination)}`, { headers: UA });
          const dData = await dRes.json();
          if (!dData?.length) throw new Error('Could not resolve destination location.');
          dCoords = [parseFloat(dData[0].lat), parseFloat(dData[0].lon)];
        }
        setDestCoords(dCoords);

        const stopCoordsList = stopsList.map(s => [parseFloat(s.lat), parseFloat(s.lng)]);

        const waypoints = [
          `${pCoords[1]},${pCoords[0]}`,
          ...stopCoordsList.map(c => `${c[1]},${c[0]}`),
          `${dCoords[1]},${dCoords[0]}`
        ].join(';');

        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`;
        const oRes = await fetch(osrmUrl);
        const oData = await oRes.json();
        if (!oData?.routes?.length) throw new Error('Failed to resolve routing path.');

        const route = oData.routes[0];
        setDistance(parseFloat((route.distance / 1000).toFixed(1)));
        setDuration(Math.round(route.duration / 60));

        const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
        setRoutePath(coords);
        setCarPosition(coords[0]);  // Initial car at start
        setLocalPathIndex(0);

      } catch (err) {
        console.error('[Tracking Geocode/Route Error]', err);
        setErrorMsg(err.message || 'An error occurred during location mapping.');
      }
    };

    calculateRoute();
  }, [pickup, destination, pickupLat, pickupLng, destLat, destLng, stops]);

  // Socket.io: Connect to /tracking namespace for live updates
  useEffect(() => {
    if (!tripId) return;

    const socket = io('/tracking', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      timeout: 10000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[TrackRide] Socket connected:', socket.id);
      socket.emit('join:trip', tripId);
    });

    socket.on('location:update', (data) => {
      const newPos = [data.lat, data.lng];
      setCarPosition(prev => {
        if (prev) {
          const bearing = getBearing(prev, newPos);
          setCarRotation(bearing);
        }
        return newPos;
      });
      setEtaMinutes(data.etaMinutes);
      setIsLive(true);
    });

    socket.on('location:arrived', () => {
      setArrived(true);
      setIsLive(false);
    });

    socket.on('disconnect', () => {
      console.log('[TrackRide] Socket disconnected');
      setIsLive(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('[TrackRide] Socket connection error:', err.message);
      setIsLive(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [tripId, token]);

  // Fallback local animation — runs only when socket is not providing live data and trip is active
  useEffect(() => {
    // Skip if we have a live socket or no route
    if (isLive || routePath.length === 0) {
      if (animIntervalRef.current) {
        clearInterval(animIntervalRef.current);
        animIntervalRef.current = null;
      }
      return;
    }

    // Always run demo animation when no live socket data
    // (shows car moving along the planned route in preview/waiting mode)

    animIntervalRef.current = setInterval(() => {
      setLocalPathIndex(prev => {
        if (prev >= routePath.length - 1) {
          clearInterval(animIntervalRef.current);
          setArrived(true);
          return prev;
        }
        const nextIdx = prev + 1;
        const newPos = routePath[nextIdx];
        const prevPos = routePath[prev];
        setCarRotation(getBearing(prevPos, newPos));
        setCarPosition(newPos);
        // Estimate ETA based on remaining path percentage
        const pct = 1 - nextIdx / (routePath.length - 1);
        setEtaMinutes(Math.max(1, Math.round(duration * pct)));
        return nextIdx;
      });
    }, 500);

    return () => {
      if (animIntervalRef.current) clearInterval(animIntervalRef.current);
    };
  }, [isLive, routePath, tripStatus, duration]);

  // Fetch last known location via REST as initial fallback
  useEffect(() => {
    if (!tripId) return;
    const fetchLocation = async () => {
      try {
        const res = await fetch(`/api/trips/${tripId}/location`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setCarPosition([data.lat, data.lng]);
          setEtaMinutes(data.etaMinutes);
        }
      } catch (_) {}
    };
    fetchLocation();
  }, [tripId, token]);

  const displayEta = etaMinutes !== null ? etaMinutes : (
    routePath.length > 0
      ? Math.max(1, Math.round(duration * (1 - localPathIndex / Math.max(1, routePath.length - 1))))
      : duration
  );

  return (
    <div className="app-container animate-fade-in">
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0.2; transform: scale(1.3); }
        }
        .car-pulse-icon { background: transparent !important; border: none !important; }
        .car-marker-icon { background: transparent !important; border: none !important; }
      `}</style>

      <Header
        onProfileClick={onProfileClick}
        currentTab={currentHeaderTab}
        setCurrentTab={(tabId) => onNavigate('dashboard', { activeTab: tabId })}
        showTabs={true}
      />

      <div className="app-body-wrapper">
        <Sidebar label="Dashboard" />

        <main className="app-content-area">
          <div className="dashboard-container" style={{ maxWidth: '1060px', padding: '0px', overflow: 'hidden' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', minHeight: '560px' }}>
              
              {/* Left Panel */}
              <div style={{ padding: '28px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                <button className="back-header" onClick={onBack} style={{ marginBottom: '4px' }}>
                  <ArrowLeft size={16} />
                  <span>Track Ride</span>
                </button>

                {errorMsg && (
                  <div className="feedback-alert feedback-error"><span>{errorMsg}</span></div>
                )}

                {/* Live / Preview Indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', backgroundColor: isLive ? 'rgba(16,185,129,0.12)' : tripStatus === 'booked' ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${isLive ? 'rgba(16,185,129,0.3)' : tripStatus === 'booked' ? 'rgba(59,130,246,0.25)' : 'rgba(245,158,11,0.3)'}`, borderRadius: '10px' }}>
                  {isLive
                    ? <Wifi size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                    : tripStatus === 'booked'
                    ? <Navigation size={16} style={{ color: '#3b82f6', flexShrink: 0 }} />
                    : <WifiOff size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
                  }
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: isLive ? '#10b981' : tripStatus === 'booked' ? '#3b82f6' : '#f59e0b' }}>
                      {isLive ? 'Live GPS Tracking' : tripStatus === 'booked' ? 'Route Preview' : 'Simulated Tracking'}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {isLive
                        ? 'Driver location updating in real-time'
                        : tripStatus === 'booked'
                        ? 'Trip not started yet — showing planned route'
                        : 'Live data unavailable — showing demo animation'
                      }
                    </div>
                  </div>
                </div>

                {/* Start Location */}
                <div className="form-group">
                  <label className="form-label">Start Location</label>
                  <div className="input-icon-wrapper">
                    <div className="input-icon-left"><Search size={18} /></div>
                    <input type="text" className="input-field" value={pickup} readOnly style={{ cursor: 'default' }} />
                  </div>
                </div>

                {/* Destination Location */}
                <div className="form-group">
                  <label className="form-label">Dest Location</label>
                  <div className="input-icon-wrapper">
                    <div className="input-icon-left"><Search size={18} /></div>
                    <input type="text" className="input-field" value={destination} readOnly style={{ cursor: 'default' }} />
                  </div>
                </div>

                {/* Driver Info Card */}
                <div style={{ backgroundColor: 'rgba(11, 15, 25, 0.5)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '50%', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                    <Users size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>{driverName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Car size={13} />
                      <span>{vehicleName}{vehicleReg ? ` (${vehicleReg})` : ''}</span>
                    </div>
                  </div>
                </div>

                {/* Route Stats */}
                {distance > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ backgroundColor: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Distance</div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>{distance} km</div>
                    </div>
                    <div style={{ backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ETA</div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: arrived ? 'var(--color-brand)' : 'var(--text-primary)', marginTop: '4px' }}>
                        {arrived ? 'Arrived!' : `${displayEta} min`}
                      </div>
                    </div>
                  </div>
                )}

                {/* Follow car toggle */}
                <button
                  className="btn btn-secondary"
                  onClick={() => setIsFollowing(f => !f)}
                  style={{ width: '100%', height: '38px', fontSize: '12px', gap: '8px' }}
                >
                  <Navigation size={14} style={{ color: isFollowing ? 'var(--color-brand)' : 'var(--text-muted)' }} />
                  <span>{isFollowing ? 'Camera: Following car' : 'Camera: Free mode'}</span>
                </button>

              </div>

              {/* Right Map Panel */}
              <div style={{ backgroundColor: '#090d16', padding: '20px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                
                {/* Map */}
                <div style={{ flex: 1, position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', zIndex: 1 }}>
                  <MapContainer
                    center={startCoords || [23.0225, 72.5714]}
                    zoom={13}
                    style={{ width: '100%', height: '100%' }}
                    zoomControl={true}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      className="osm-tiles"
                    />

                    {/* Route polyline */}
                    {routePath.length > 0 && (
                      <Polyline positions={routePath} color="#3b82f6" weight={4} opacity={0.7} />
                    )}

                    {/* Completed path (behind car) — orange */}
                    {carPosition && routePath.length > 0 && localPathIndex > 0 && (
                      <Polyline
                        positions={routePath.slice(0, localPathIndex + 1)}
                        color="#f59e0b"
                        weight={4}
                        opacity={0.9}
                      />
                    )}

                    {startCoords && <Marker position={startCoords} icon={startIcon} />}
                    {destCoords && <Marker position={destCoords} icon={destIcon} />}

                    {/* Render intermediate stop markers */}
                    {stopsList.map((stop, idx) => {
                      const stopPos = [parseFloat(stop.lat), parseFloat(stop.lng)];
                      const stopIcon = L.divIcon({
                        html: `<div style="background-color:#f59e0b;color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:11px;font-weight:700">${idx + 1}</div>`,
                        className: 'custom-leaflet-icon-stop',
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                      });
                      return <Marker key={idx} position={stopPos} icon={stopIcon} />;
                    })}

                    {/* Pulse ring + Car marker */}
                    {carPosition && (
                      <>
                        <Marker position={carPosition} icon={pulseIcon} />
                        <Marker position={carPosition} icon={makeCarIcon(carRotation)} />
                      </>
                    )}

                    <MapRecenter
                      carPosition={isFollowing ? carPosition : null}
                      startCoords={startCoords}
                      destCoords={destCoords}
                      isTracking={isFollowing && carPosition !== null}
                    />
                  </MapContainer>
                </div>

                {/* Status Banner */}
                <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: arrived ? 'rgba(16,185,129,0.12)' : 'rgba(21,28,44,0.95)', border: `1px solid ${arrived ? 'rgba(16,185,129,0.3)' : 'var(--border-color)'}`, borderRadius: '10px', padding: '14px 20px', fontSize: '14px', fontWeight: '600', color: arrived ? 'var(--color-brand)' : 'var(--text-primary)' }}>
                  <span>
                    {arrived
                      ? '✓ Arrived at Destination!'
                      : isLive
                      ? `🟢 Live — ETA ${displayEta} min`
                      : tripStatus === 'booked'
                      ? '🔵 Waiting for driver to start trip…'
                      : carPosition
                      ? `🟡 Simulating — ${displayEta} min remaining`
                      : 'Loading route…'
                    }
                  </span>
                  {!arrived && carPosition && (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '400' }}>
                      {distance > 0 ? `${distance} km total` : ''}
                    </span>
                  )}
                </div>

              </div>

            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

export default TrackRide;
