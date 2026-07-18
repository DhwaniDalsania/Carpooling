import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Clock, MapPin, Check, Loader2, Compass, ChevronDown } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import Header from './Header';
import Sidebar from './Sidebar';

// Custom Leaflet Icons using Lucide SVG templates for 100% reliable local rendering
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

// Helper component to auto-pan and zoom map container to fit path bounds
function MapRecenter({ startCoords, destCoords }) {
  const map = useMap();
  useEffect(() => {
    if (startCoords && destCoords) {
      const bounds = L.latLngBounds([startCoords, destCoords]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (startCoords) {
      map.setView(startCoords, 13);
    } else if (destCoords) {
      map.setView(destCoords, 13);
    }
  }, [startCoords, destCoords, map]);
  return null;
}

export const RouteConfirmation = ({ routeState, onBack, onProfileClick, onNavigate }) => {
  const { user, token } = useAuth();
  
  // Navigation states
  const [currentHeaderTab, setCurrentHeaderTab] = useState('dashboard');
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Geocoding and OSRM states
  const [startCoords, setStartCoords] = useState(null); // [lat, lng]
  const [destCoords, setDestCoords] = useState(null); // [lat, lng]
  const [distance, setDistance] = useState(0); // km
  const [duration, setDuration] = useState(0); // mins
  const [routePath, setRoutePath] = useState([]); // array of [lat, lng]
  const [routeGeoJson, setRouteGeoJson] = useState(null); // full JSON
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Fallbacks if data is missing
  const pickup = routeState?.pickupLocation || '';
  const destination = routeState?.destination || '';
  const rideType = routeState?.type || 'find'; // 'find' or 'offer'

  // Format date/time for schedule select field
  const getScheduleText = () => {
    if (rideType === 'find') {
      if (routeState?.date && routeState?.time) {
        return `${routeState.date} at ${routeState.time}`;
      }
      return 'Pick up now';
    } else {
      if (routeState?.dateTime) {
        return new Date(routeState.dateTime).toLocaleString();
      }
      return 'Pick up now';
    }
  };

  // Perform geocoding & route calculations on component mount
  useEffect(() => {
    const calculateRoute = async () => {
      if (!pickup || !destination) {
        setErrorMsg('Pickup and destination locations are missing.');
        return;
      }

      setIsGeocoding(true);
      setErrorMsg('');

      try {
        const userAgentHeader = {
          'User-Agent': 'EnterpriseCarpoolingHackathon/1.0 (dhwanidalsania@example.com)'
        };

        // 1. Geocode Pickup address via Nominatim
        const pickupUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(pickup)}`;
        const pResponse = await fetch(pickupUrl, { headers: userAgentHeader });
        const pData = await pResponse.json();
        
        if (!pData || pData.length === 0) {
          throw new Error(`Could not find coordinate for pickup location: "${pickup}". Try a larger city name.`);
        }
        
        const pCoords = [parseFloat(pData[0].lat), parseFloat(pData[0].lon)];
        setStartCoords(pCoords);

        // 2. Geocode Destination address via Nominatim
        const destUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(destination)}`;
        const dResponse = await fetch(destUrl, { headers: userAgentHeader });
        const dData = await dResponse.json();

        if (!dData || dData.length === 0) {
          throw new Error(`Could not find coordinate for destination location: "${destination}". Try a larger city name.`);
        }

        const dCoords = [parseFloat(dData[0].lat), parseFloat(dData[0].lon)];
        setDestCoords(dCoords);

        // 3. Query route polyline from OSRM
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pCoords[1]},${pCoords[0]};${dCoords[1]},${dCoords[0]}?overview=full&geometries=geojson`;
        const oResponse = await fetch(osrmUrl);
        const oData = await oResponse.json();

        if (!oData || !oData.routes || oData.routes.length === 0) {
          throw new Error('OSRM Route calculation failed. Check network access.');
        }

        const route = oData.routes[0];
        setDistance(parseFloat((route.distance / 1000).toFixed(1))); // convert to km
        setDuration(Math.round(route.duration / 60)); // convert to minutes
        setRouteGeoJson(route.geometry);

        // Map coordinates from [lon, lat] (OSRM) to [lat, lon] (Leaflet)
        const coords = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        setRoutePath(coords);

      } catch (err) {
        console.error('[Geocode/Route Error]', err);
        setErrorMsg(err.message || 'An error occurred during geocoding.');
      } finally {
        setIsGeocoding(false);
      }
    };

    calculateRoute();
  }, [pickup, destination]);

  // Submit / Confirm Route handler
  const handleConfirm = async () => {
    if (!startCoords || !destCoords) {
      alert('Cannot confirm: Coordinates are not resolved yet.');
      return;
    }

    setIsConfirming(true);
    setErrorMsg('');

    try {
      if (rideType === 'offer') {
        // Driver publishes offer to database via POST /api/rides
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
            availableSeats: routeState.seats,
            farePerSeat: routeState.fare,
            vehicleId: routeState.vehicleId || 'v1',
            routeGeoJson: routeGeoJson,
            distanceKm: distance
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to post ride offer.');
        }

        setConfirmSuccess(true);
        setTimeout(() => {
          setConfirmSuccess(false);
          // Redirect to My Trips on success
          onNavigate('dashboard', null);
        }, 1500);

      } else {
        // Passenger searches database via GET /api/rides/search
        const response = await fetch(
          `/api/rides/search?pickupLat=${startCoords[0]}&pickupLng=${startCoords[1]}&destLat=${destCoords[0]}&destLng=${destCoords[1]}&seats=${routeState.seats}&date=${routeState.date}`
        );
        
        const matchingRides = await response.json();
        if (!response.ok) {
          throw new Error(matchingRides.message || 'Search request failed.');
        }

        // Navigate to Available Rides Screen (07), passing matching rides and search criteria
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
      {/* Header Bar */}
      <Header
        onProfileClick={onProfileClick}
        currentTab={currentHeaderTab}
        setCurrentTab={setCurrentHeaderTab}
        showTabs={true}
      />

      {/* Main Layout wrapper */}
      <div className="app-body-wrapper">
        <Sidebar label="Carpooling" />

        <main className="app-content-area">
          <div className="dashboard-container" style={{ maxWidth: '1000px', padding: '0px', overflow: 'hidden' }}>
            
            {/* Split layout: Form left, Map right */}
            <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', minHeight: '540px' }}>
              
              {/* Left Form Panel */}
              <div style={{ padding: '32px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Back Link "< Trip" */}
                  <button className="back-header" onClick={onBack} style={{ marginBottom: '12px' }}>
                    <ArrowLeft size={16} />
                    <span>Trip</span>
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
                    <label className="form-label">Destination Location</label>
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

                  {/* Pick up schedule dropdown */}
                  <div className="form-group">
                    <label className="form-label">Pickup Schedule</label>
                    <div className="input-icon-wrapper seat-select-wrapper">
                      <div className="input-icon-left">
                        <Clock size={18} />
                      </div>
                      <select className="input-field seat-select" disabled style={{ opacity: 1, cursor: 'default' }}>
                        <option>{getScheduleText()}</option>
                      </select>
                      <ChevronDown size={18} className="select-arrow-icon" />
                    </div>
                  </div>

                </div>

                {/* Confirm Button at Bottom */}
                <div style={{ marginTop: '24px' }}>
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
                
                {/* Header Stats bar */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  backgroundColor: 'rgba(21, 28, 44, 0.85)', 
                  border: '1px solid var(--border-color)', 
                  padding: '16px 20px', 
                  borderRadius: '12px', 
                  zIndex: 1000, 
                  backdropFilter: 'blur(4px)',
                  marginBottom: '16px'
                }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Distance</span>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{distance ? `${distance} km` : '--'}</div>
                  </div>
                  <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '20px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Est. Duration</span>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{duration ? `${duration} mins` : '--'}</div>
                  </div>
                  <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '20px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      {rideType === 'find' ? 'Est. Fare' : 'Total Fare'}
                    </span>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-brand)' }}>
                      {rideType === 'find' ? '$12.00' : `$${(routeState?.fare || 10) * (routeState?.seats || 1)}.00`}
                    </div>
                  </div>
                </div>

                {/* React-Leaflet Map Container */}
                <div style={{ flex: 1, position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', zIndex: 1 }}>
                  
                  <MapContainer 
                    center={startCoords || [23.0225, 72.5714]} // Defaults to Ahmedabad center
                    zoom={12} 
                    style={{ width: '100%', height: '100%' }}
                    zoomControl={true}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      className="osm-tiles"
                    />

                    {/* Plot start coordinate marker */}
                    {startCoords && (
                      <Marker position={startCoords} icon={startIcon} />
                    )}

                    {/* Plot destination coordinate marker */}
                    {destCoords && (
                      <Marker position={destCoords} icon={destIcon} />
                    )}

                    {/* Draw polyline route path fetched from OSRM */}
                    {routePath.length > 0 && (
                      <Polyline 
                        positions={routePath} 
                        color="#0d9488" 
                        weight={5} 
                        opacity={0.8}
                        dashArray="10, 5"
                      />
                    )}

                    {/* Recenter triggers */}
                    <MapRecenter startCoords={startCoords} destCoords={destCoords} />
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
