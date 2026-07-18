import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Clock, MapPin, Loader2, Users, Car } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import Header from './Header';
import Sidebar from './Sidebar';

// Custom Map Icons using Lucide SVG templates
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

const carIcon = L.divIcon({
  html: `<div style="background-color: #f59e0b; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.5);"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2 11.1 2 11.3 2 11.5V16c0 .6.4 1 1 1h2m10 0a3 3 0 1 1-6 0m6 0a3 3 0 1 0-6 0"/></svg></div>`,
  className: 'custom-leaflet-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

// Helper component to auto-pan and zoom map container to fit path bounds
function MapRecenter({ startCoords, destCoords }) {
  const map = useMap();
  useEffect(() => {
    if (startCoords && destCoords) {
      const bounds = L.latLngBounds([startCoords, destCoords]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [startCoords, destCoords, map]);
  return null;
}

export const TrackRide = ({ routeState, onBack, onProfileClick }) => {
  // Navigation states
  const [currentHeaderTab, setCurrentHeaderTab] = useState('dashboard');
  const [errorMsg, setErrorMsg] = useState('');

  // Geocoding and OSRM states
  const [startCoords, setStartCoords] = useState(null); // [lat, lng]
  const [destCoords, setDestCoords] = useState(null); // [lat, lng]
  const [distance, setDistance] = useState(0); // km
  const [duration, setDuration] = useState(0); // mins
  const [routePath, setRoutePath] = useState([]); // array of [lat, lng]
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Animated vehicle position index
  const [currentPathIndex, setCurrentPathIndex] = useState(0);

  // Extract trip detail parameters passed in navigation
  const pickup = routeState?.pickupLocation || 'Iskcon';
  const destination = routeState?.destination || 'Infocity';
  const driverName = routeState?.driverName || 'Raj Patel';
  const vehicleName = routeState?.vehicleName || 'Swift Dzire';
  const vehicleReg = routeState?.vehicleReg || 'GJ01AB1234';

  // Perform geocoding & route calculations on component mount
  useEffect(() => {
    const calculateRoute = async () => {
      setIsGeocoding(true);
      setErrorMsg('');

      try {
        const userAgentHeader = {
          'User-Agent': 'EnterpriseCarpoolingHackathon/1.0 (dhwanidalsania@example.com)'
        };

        // 1. Geocode Pickup address via Nominatim
        const pResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(pickup)}`,
          { headers: userAgentHeader }
        );
        const pData = await pResponse.json();
        if (!pData || pData.length === 0) {
          throw new Error('Could not resolve pickup location coordinates.');
        }
        const pCoords = [parseFloat(pData[0].lat), parseFloat(pData[0].lon)];
        setStartCoords(pCoords);

        // 2. Geocode Destination address via Nominatim
        const dResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(destination)}`,
          { headers: userAgentHeader }
        );
        const dData = await dResponse.json();
        if (!dData || dData.length === 0) {
          throw new Error('Could not resolve destination location coordinates.');
        }
        const dCoords = [parseFloat(dData[0].lat), parseFloat(dData[0].lon)];
        setDestCoords(dCoords);

        // 3. Query route polyline from OSRM
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pCoords[1]},${pCoords[0]};${dCoords[1]},${dCoords[0]}?overview=full&geometries=geojson`;
        const oResponse = await fetch(osrmUrl);
        const oData = await oResponse.json();

        if (!oData || !oData.routes || oData.routes.length === 0) {
          throw new Error('Failed to resolve routing path.');
        }

        const route = oData.routes[0];
        setDistance(parseFloat((route.distance / 1000).toFixed(1)));
        setDuration(Math.round(route.duration / 60));

        // Map coordinates to [lat, lon] for Leaflet
        const coords = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        setRoutePath(coords);
        setCurrentPathIndex(0);

      } catch (err) {
        console.error('[Tracking Geocode/Route Error]', err);
        setErrorMsg(err.message || 'An error occurred during location mapping.');
      } finally {
        setIsGeocoding(false);
      }
    };

    calculateRoute();
  }, [pickup, destination]);

  // Vehicle animation loop
  useEffect(() => {
    if (routePath.length === 0) return;

    const interval = setInterval(() => {
      setCurrentPathIndex((prevIndex) => {
        if (prevIndex >= routePath.length - 1) {
          return 0; // Restart loop for demo longevity
        }
        return prevIndex + 1;
      });
    }, 600); // Step every 600ms for smooth speed

    return () => clearInterval(interval);
  }, [routePath]);

  // Determine remaining ETA dynamically based on current index
  const getRemainingMinutes = () => {
    if (routePath.length === 0 || duration === 0) return 5;
    
    // Calculate percentage remaining
    const percentLeft = 1 - (currentPathIndex / (routePath.length - 1));
    const minsLeft = Math.round(duration * percentLeft);

    return Math.max(1, minsLeft);
  };

  return (
    <div className="app-container animate-fade-in">
      {/* Header Bar */}
      <Header
        onProfileClick={onProfileClick}
        currentTab={currentHeaderTab}
        setCurrentTab={setCurrentHeaderTab}
        showTabs={true}
      />

      {/* Main Layout wrapper */}
      <div className="app-body-wrapper">
        <Sidebar label="Dashboard" />

        <main className="app-content-area">
          <div className="dashboard-container" style={{ maxWidth: '1000px', padding: '0px', overflow: 'hidden' }}>
            
            {/* Split layout: Details left, Map right */}
            <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', minHeight: '540px' }}>
              
              {/* Left Panel */}
              <div style={{ padding: '32px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Back Link "< Track Ride" */}
                <button className="back-header" onClick={onBack} style={{ marginBottom: '8px' }}>
                  <ArrowLeft size={16} />
                  <span>Track Ride</span>
                </button>

                {errorMsg && (
                  <div className="feedback-alert feedback-error">
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Start Location Input */}
                <div className="form-group">
                  <label className="form-label">Start Location</label>
                  <div className="input-icon-wrapper">
                    <div className="input-icon-left">
                      {isGeocoding ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                    </div>
                    <input
                      type="text"
                      className="input-field"
                      value={pickup}
                      readOnly
                      style={{ cursor: 'default' }}
                    />
                  </div>
                </div>

                {/* Destination Location Input */}
                <div className="form-group">
                  <label className="form-label">Dest Location</label>
                  <div className="input-icon-wrapper">
                    <div className="input-icon-left">
                      {isGeocoding ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                    </div>
                    <input
                      type="text"
                      className="input-field"
                      value={destination}
                      readOnly
                      style={{ cursor: 'default' }}
                    />
                  </div>
                </div>

                {/* Driver Info Card */}
                <div style={{ 
                  backgroundColor: 'rgba(11, 15, 25, 0.5)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: '20px', 
                  marginTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '50%', 
                    backgroundColor: 'var(--bg-card)', 
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-secondary)'
                  }}>
                    <Users size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>{driverName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Car size={14} />
                      <span>{vehicleName} ({vehicleReg})</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Map Panel */}
              <div style={{ backgroundColor: '#090d16', padding: '24px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                
                {/* Map Container wrapper */}
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

                    {/* Start Marker */}
                    {startCoords && (
                      <Marker position={startCoords} icon={startIcon} />
                    )}

                    {/* Destination Marker */}
                    {destCoords && (
                      <Marker position={destCoords} icon={destIcon} />
                    )}

                    {/* Route Polyline */}
                    {routePath.length > 0 && (
                      <Polyline 
                        positions={routePath} 
                        color="#3b82f6" 
                        weight={5} 
                        opacity={0.8}
                      />
                    )}

                    {/* Animated Car Marker */}
                    {routePath.length > 0 && routePath[currentPathIndex] && (
                      <Marker position={routePath[currentPathIndex]} icon={carIcon} />
                    )}

                    <MapRecenter startCoords={startCoords} destCoords={destCoords} />
                  </MapContainer>

                </div>

                {/* Status Indicator Banner at Bottom ("Coming in 5 Minutes" style) */}
                <div style={{ 
                  marginTop: '16px', 
                  backgroundColor: 'rgba(21, 28, 44, 0.95)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '12px', 
                  padding: '16px 20px', 
                  textAlign: 'center',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>
                  {currentPathIndex >= routePath.length - 2 ? (
                    <span style={{ color: 'var(--color-brand)' }}>Arrived at Destination!</span>
                  ) : (
                    <span>Coming in {getRemainingMinutes()} Minutes</span>
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
