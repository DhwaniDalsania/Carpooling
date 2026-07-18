import React, { useState, useEffect } from 'react';
import { 
  Search, ArrowUpDown, Clock, Users, ChevronDown, Repeat, 
  DollarSign, Car, Calendar, Navigation, MessageSquare, 
  Phone, MapPin, MoreVertical, Plus, Trash2, Wallet, Settings, Activity,
  ArrowLeft, Check, Loader2, ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Header from './Header';
import Sidebar from './Sidebar';

export const Dashboard = ({ onProfileClick, onNavigate, dashboardState }) => {
  const { user, token } = useAuth();
  
  // Dashboard Tabs (dashboard, trips, vehicle, history, wallet, setting)
  const [currentHeaderTab, setCurrentHeaderTab] = useState('dashboard');
  const [activeSearchTab, setActiveSearchTab] = useState('find'); // 'find' or 'offer'

  // Sync tab with external navigation state updates
  useEffect(() => {
    if (dashboardState?.activeTab) {
      setCurrentHeaderTab(dashboardState.activeTab);
    }
  }, [dashboardState]);

  // Find a Ride Form States
  const [pickupLoc, setPickupLoc] = useState('');
  const [destLoc, setDestLoc] = useState('');
  const [rideDate, setRideDate] = useState('');
  const [rideTime, setRideTime] = useState('');
  const [numSeats, setNumSeats] = useState('1');
  const [isRecurring, setIsRecurring] = useState(false);

  // Offer a Ride Form States
  const [offerPickup, setOfferPickup] = useState('');
  const [offerDest, setOfferDest] = useState('');
  const [offerDateTime, setOfferDateTime] = useState('');
  const [offerSeats, setOfferSeats] = useState('1');
  const [offerFare, setOfferFare] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');

  // Dynamic lists from backend
  const [userVehicles, setUserVehicles] = useState([]);
  const [activeTrips, setActiveTrips] = useState([]);
  const [historyTrips, setHistoryTrips] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Add Vehicle Form States
  const [newModel, setNewModel] = useState('');
  const [newReg, setNewReg] = useState('');
  const [newCapacity, setNewCapacity] = useState('4');
  const [newActive, setNewActive] = useState(true);
  const [vehicleSuccess, setVehicleSuccess] = useState('');

  // ── Database Fetching Handlers ─────────────────────────────────────────────
  
  const fetchVehicles = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/vehicles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserVehicles(data);
        const activeCar = data.find(v => v.status === 'active');
        if (activeCar) {
          setSelectedVehicle(activeCar.id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch vehicles', err);
    }
  };

  const fetchTrips = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/trips?history=false', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveTrips(data);
      }
    } catch (err) {
      console.error('Failed to fetch active trips', err);
    }
  };

  const fetchHistory = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/trips?history=true', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistoryTrips(data);
      }
    } catch (err) {
      console.error('Failed to fetch history trips', err);
    }
  };

  // Sync data loaders depending on current tab
  useEffect(() => {
    if (!token) return;

    const loadData = async () => {
      setIsLoadingData(true);
      if (currentHeaderTab === 'dashboard' || currentHeaderTab === 'vehicle') {
        await fetchVehicles();
      }
      if (currentHeaderTab === 'trips') {
        await fetchTrips();
      }
      if (currentHeaderTab === 'history') {
        await fetchHistory();
      }
      setIsLoadingData(false);
    };

    loadData();
  }, [currentHeaderTab, token]);

  // Swap Locations function
  const handleSwapLocations = () => {
    if (activeSearchTab === 'find') {
      const temp = pickupLoc;
      setPickupLoc(destLoc);
      setDestLoc(temp);
    } else {
      const temp = offerPickup;
      setOfferPickup(offerDest);
      setOfferDest(temp);
    }
  };

  // Submit Find Ride
  const handleFindSubmit = (e) => {
    e.preventDefault();
    if (!pickupLoc.trim() || !destLoc.trim() || !rideDate || !rideTime || !numSeats) {
      alert('All fields are required.');
      return;
    }
    
    onNavigate('route-confirmation', {
      type: 'find',
      pickupLocation: pickupLoc,
      destination: destLoc,
      date: rideDate,
      time: rideTime,
      seats: numSeats,
      isRecurring
    });
  };

  // Submit Offer Ride
  const handleOfferSubmit = (e) => {
    e.preventDefault();
    
    // Validate that a vehicle exists only when publishing a ride
    if (userVehicles.length === 0) {
      alert('You must register a vehicle first before offering a ride.');
      setCurrentHeaderTab('vehicle');
      return;
    }

    if (!offerPickup.trim() || !offerDest.trim() || !offerDateTime || !offerSeats || !offerFare || !selectedVehicle) {
      alert('All fields are required.');
      return;
    }

    const selectedCar = userVehicles.find(v => v.id === selectedVehicle);

    onNavigate('route-confirmation', {
      type: 'offer',
      pickupLocation: offerPickup,
      destination: offerDest,
      dateTime: offerDateTime,
      seats: offerSeats,
      fare: offerFare,
      vehicleId: selectedVehicle,
      vehicle: selectedCar ? `${selectedCar.model} (${selectedCar.registrationNumber})` : 'Registered Vehicle'
    });
  };

  // Add Vehicle Submit
  const handleAddVehicle = async (e) => {
    e.preventDefault();
    if (!newModel.trim() || !newReg.trim() || !newCapacity) {
      alert('All fields are required');
      return;
    }

    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          model: newModel,
          registrationNumber: newReg,
          seatingCapacity: parseInt(newCapacity, 10),
          status: newActive ? 'active' : 'inactive'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to register vehicle.');
      }

      setVehicleSuccess('Vehicle registered successfully!');
      setNewModel('');
      setNewReg('');
      setNewCapacity('4');
      setNewActive(true);
      
      await fetchVehicles();
      setTimeout(() => setVehicleSuccess(''), 2000);
    } catch (err) {
      alert(err.message);
    }
  };

  // Toggle vehicle status locally
  const handleToggleVehicleStatus = (id) => {
    setUserVehicles(userVehicles.map(v => {
      if (v.id === id) {
        return { ...v, status: v.status === 'active' ? 'inactive' : 'active' };
      }
      return v;
    }));
  };

  const formatRideDate = (datetimeStr) => {
    if (!datetimeStr) return '';
    try {
      const date = new Date(datetimeStr);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const day = date.getDate();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear().toString().substring(2);
      
      return `${hours}:${minutes} ${day}/${month}/${year}`;
    } catch {
      return datetimeStr;
    }
  };

  // Helper to determine sidebar text rotation label
  const getSidebarLabel = () => {
    switch (currentHeaderTab) {
      case 'trips':
        return 'My Trips';
      case 'vehicle':
        return 'My Vehicle';
      case 'history':
        return 'History';
      case 'wallet':
        return 'Wallet';
      case 'setting':
        return 'Setting';
      default:
        return 'Carpooling';
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

      {/* Main layout */}
      <div className="app-body-wrapper">
        <Sidebar label={getSidebarLabel()} />

        <main className="app-content-area">
          
          {/* Sub-view: DASHBOARD SEARCH/OFFER FORMS */}
          {currentHeaderTab === 'dashboard' && (
            <div className="dashboard-container">
              {/* Form Selection Tabs */}
              <div className="dashboard-toggle-tabs">
                <button
                  className={`tab-toggle-btn ${activeSearchTab === 'find' ? 'active' : ''}`}
                  onClick={() => setActiveSearchTab('find')}
                >
                  Find a Ride
                </button>
                <button
                  className={`tab-toggle-btn ${activeSearchTab === 'offer' ? 'active' : ''}`}
                  onClick={() => setActiveSearchTab('offer')}
                >
                  Offer a Ride
                </button>
              </div>

              {/* Find a Ride Form */}
              {activeSearchTab === 'find' && (
                <form onSubmit={handleFindSubmit} className="auth-form">
                  <div className="locations-container">
                    <div className="form-group">
                      <label className="form-label">Pickup Location</label>
                      <div className="input-icon-wrapper">
                        <div className="input-icon-left">
                          <Search size={18} />
                        </div>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Pick up location"
                          value={pickupLoc}
                          onChange={(e) => setPickupLoc(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="swap-btn-container">
                      <button
                        type="button"
                        className="swap-btn"
                        onClick={handleSwapLocations}
                        title="Swap locations"
                      >
                        <ArrowUpDown size={18} />
                      </button>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Destination Location</label>
                      <div className="input-icon-wrapper">
                        <div className="input-icon-left">
                          <Search size={18} />
                        </div>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Enter Drop location"
                          value={destLoc}
                          onChange={(e) => setDestLoc(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-row-2col">
                    <div className="form-group">
                      <label className="form-label">Date</label>
                      <div className="input-icon-wrapper">
                        <div className="input-icon-left">
                          <Calendar size={18} />
                        </div>
                        <input
                          type="date"
                          className="input-field"
                          value={rideDate}
                          onChange={(e) => setRideDate(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Time</label>
                      <div className="input-icon-wrapper">
                        <div className="input-icon-left">
                          <Clock size={18} />
                        </div>
                        <input
                          type="time"
                          className="input-field"
                          value={rideTime}
                          onChange={(e) => setRideTime(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Number of Seats</label>
                    <div className="input-icon-wrapper seat-select-wrapper">
                      <div className="input-icon-left">
                        <Users size={18} />
                      </div>
                      <select
                        className="input-field seat-select"
                        value={numSeats}
                        onChange={(e) => setNumSeats(e.target.value)}
                        required
                      >
                        <option value="1">1 Seat</option>
                        <option value="2">2 Seats</option>
                        <option value="3">3 Seats</option>
                        <option value="4">4 Seats</option>
                      </select>
                      <ChevronDown size={18} className="select-arrow-icon" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="toggle-wrapper">
                      <input
                        type="checkbox"
                        className="toggle-input"
                        checked={isRecurring}
                        onChange={(e) => setIsRecurring(e.target.checked)}
                      />
                      <div className="toggle-switch"></div>
                      <span className="toggle-label">
                        <Repeat size={16} />
                        <span>Recurring Ride - Mo,Tu,We,Th,FR</span>
                      </span>
                    </label>
                  </div>

                  <button type="submit" className="btn btn-primary">
                    <Navigation size={18} />
                    <span>Find Ride</span>
                  </button>
                </form>
              )}

              {/* Offer a Ride Form */}
              {activeSearchTab === 'offer' && (
                <form onSubmit={handleOfferSubmit} className="auth-form">
                  <div className="locations-container">
                    <div className="form-group">
                      <label className="form-label">Pickup Location</label>
                      <div className="input-icon-wrapper">
                        <div className="input-icon-left">
                          <Search size={18} />
                        </div>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Enter pick up point"
                          value={offerPickup}
                          onChange={(e) => setOfferPickup(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="swap-btn-container">
                      <button
                        type="button"
                        className="swap-btn"
                        onClick={handleSwapLocations}
                        title="Swap locations"
                      >
                        <ArrowUpDown size={18} />
                      </button>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Destination Location</label>
                      <div className="input-icon-wrapper">
                        <div className="input-icon-left">
                          <Search size={18} />
                        </div>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Enter drop point"
                          value={offerDest}
                          onChange={(e) => setOfferDest(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-row-2col">
                    <div className="form-group">
                      <label className="form-label">Departure Date & Time</label>
                      <div className="input-icon-wrapper">
                        <div className="input-icon-left">
                          <Clock size={18} />
                        </div>
                        <input
                          type="datetime-local"
                          className="input-field"
                          value={offerDateTime}
                          onChange={(e) => setOfferDateTime(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Available Seats</label>
                      <div className="input-icon-wrapper seat-select-wrapper">
                        <div className="input-icon-left">
                          <Users size={18} />
                        </div>
                        <select
                          className="input-field seat-select"
                          value={offerSeats}
                          onChange={(e) => setOfferSeats(e.target.value)}
                          required
                        >
                          <option value="1">1 Seat</option>
                          <option value="2">2 Seats</option>
                          <option value="3">3 Seats</option>
                          <option value="4">4 Seats</option>
                        </select>
                        <ChevronDown size={18} className="select-arrow-icon" />
                      </div>
                    </div>
                  </div>

                  <div className="form-row-2col">
                    <div className="form-group">
                      <label className="form-label">Fare per Seat ($)</label>
                      <div className="input-icon-wrapper">
                        <div className="input-icon-left">
                          <DollarSign size={18} />
                        </div>
                        <input
                          type="number"
                          min="1"
                          className="input-field"
                          placeholder="Price per seat"
                          value={offerFare}
                          onChange={(e) => setOfferFare(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Vehicle</label>
                      <div className="input-icon-wrapper seat-select-wrapper">
                        <div className="input-icon-left">
                          <Car size={18} />
                        </div>
                        <select
                          className="input-field seat-select"
                          value={selectedVehicle}
                          onChange={(e) => setSelectedVehicle(e.target.value)}
                          required
                        >
                          {userVehicles.length === 0 ? (
                            <option value="">-- No Vehicles Registered --</option>
                          ) : (
                            userVehicles
                              .filter(v => v.status === 'active')
                              .map((vehicle) => (
                                <option key={vehicle.id} value={vehicle.id}>
                                  {vehicle.model} ({vehicle.registrationNumber})
                                </option>
                              ))
                          )}
                        </select>
                        <ChevronDown size={18} className="select-arrow-icon" />
                      </div>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary">
                    <Car size={18} />
                    <span>Offer Ride</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Sub-view: MY TRIPS - TRIP DETAILS (Matches Image 3 Exactly, now fully relational) */}
          {currentHeaderTab === 'trips' && (
            <div className="dashboard-container" style={{ maxWidth: '800px' }}>
              
              {/* Back Link "< Trip Detail" */}
              <button className="back-header" onClick={() => setCurrentHeaderTab('dashboard')}>
                <ArrowLeft size={16} />
                <span>Trip Detail</span>
              </button>

              {isLoadingData ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Loader2 className="animate-spin" size={28} style={{ margin: '0 auto' }} />
                </div>
              ) : activeTrips.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '48px 24px', 
                  backgroundColor: 'var(--bg-input)', 
                  border: '1px dashed var(--border-color)', 
                  borderRadius: '12px',
                  color: 'var(--text-secondary)'
                }}>
                  No upcoming active trips scheduled. Search rides to book a seat, or offer a ride to publish an route!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {activeTrips.map((trip) => {
                    // Determine role dynamically per trip from relationship
                    const isDriver = trip.driverId === user?.id;

                    return (
                      <div 
                        key={trip.id}
                        style={{ 
                          backgroundColor: 'var(--bg-input)', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: 'var(--radius-lg)', 
                          padding: '28px', 
                          boxShadow: 'var(--shadow-md)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '24px',
                          position: 'relative'
                        }}
                      >
                        {/* 3-dots actions icon on top-right */}
                        <button style={{ 
                          position: 'absolute', 
                          top: '24px', 
                          right: '24px', 
                          background: 'none', 
                          border: 'none', 
                          color: 'var(--text-muted)', 
                          cursor: 'pointer' 
                        }}>
                          <MoreVertical size={20} />
                        </button>

                        {/* Badge specifying dynamic role */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ 
                            fontSize: '11px', 
                            fontWeight: '700', 
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            padding: '3px 10px', 
                            borderRadius: '4px',
                            backgroundColor: isDriver ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: isDriver ? 'var(--color-brand)' : '#3b82f6'
                          }}>
                            {isDriver ? 'Driver View' : 'Passenger View'}
                          </span>
                        </div>

                        {/* Driver / Passenger details row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ 
                            width: '56px', 
                            height: '56px', 
                            borderRadius: '50%', 
                            backgroundColor: 'var(--bg-card)', 
                            border: '2px solid var(--border-color)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-secondary)'
                          }}>
                            <Users size={28} />
                          </div>
                          <div>
                            {isDriver ? (
                              <>
                                <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                                  You (Driver)
                                </h2>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                  Passengers: {trip.passengers?.length > 0 
                                    ? trip.passengers.map(p => p.user?.name).join(', ') 
                                    : 'No passengers registered yet.'}
                                </div>
                              </>
                            ) : (
                              <>
                                <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                                  {trip.driver?.name || 'Carpool Driver'}
                                </h2>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                  {trip.ride?.pickupAddress} to {trip.ride?.destAddress}
                                </div>
                              </>
                            )}
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {formatRideDate(trip.ride?.datetime)}
                            </div>
                          </div>
                        </div>

                        {/* Route/Vehicle Details Grid */}
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '1fr 1fr 1fr', 
                          gap: '16px', 
                          backgroundColor: 'rgba(11, 15, 25, 0.4)', 
                          padding: '20px', 
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)' 
                        }}>
                          {/* Vehicle Column */}
                          <div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '8px' }}>Vehicle</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                              <Car size={18} className="brand-logo" />
                              <div>
                                <div style={{ fontSize: '14px', fontWeight: '600' }}>{trip.vehicle?.model || 'Swift Dzire'}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{trip.vehicle?.registrationNumber || 'GJ01AB1234'}</div>
                              </div>
                            </div>
                          </div>

                          {/* Pick Up Point Column */}
                          <div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '8px' }}>Pick UP Point</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                              <MapPin size={18} style={{ color: '#3b82f6' }} />
                              <div style={{ fontSize: '14px', fontWeight: '600' }}>{trip.ride?.pickupAddress || 'Iskcon'}</div>
                            </div>
                          </div>

                          {/* Drop Point Column */}
                          <div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '8px' }}>Drop Point</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                              <MapPin size={18} style={{ color: 'var(--color-brand)' }} />
                              <div style={{ fontSize: '14px', fontWeight: '600' }}>{trip.ride?.destAddress || 'Infocity'}</div>
                            </div>
                          </div>
                        </div>

                        {/* Communication and Price bar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                          
                          {/* Buttons group (only shown for passengers communicating with drivers) */}
                          <div style={{ display: 'flex', gap: '12px' }}>
                            {!isDriver ? (
                              <>
                                <button className="btn btn-secondary" style={{ height: '42px', padding: '0 16px', fontSize: '13px' }}>
                                  <MessageSquare size={16} />
                                  <span>Chat with Driver</span>
                                </button>
                                <button className="btn btn-secondary" style={{ height: '42px', padding: '0 16px', fontSize: '13px' }}>
                                  <Phone size={16} />
                                  <span>Call To Driver</span>
                                </button>
                                <button 
                                  className="btn btn-primary" 
                                  style={{ height: '42px', padding: '0 16px', fontSize: '13px' }}
                                  onClick={() => onNavigate('track-ride', {
                                    pickupLocation: trip.ride?.pickupAddress,
                                    destination: trip.ride?.destAddress,
                                    driverName: trip.driver?.name,
                                    vehicleName: trip.vehicle?.model,
                                    vehicleReg: trip.vehicle?.registrationNumber
                                  })}
                                >
                                  <Navigation size={16} />
                                  <span>Track Ride</span>
                                </button>
                              </>
                            ) : (
                              <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Check size={16} style={{ color: 'var(--color-brand)' }} />
                                <span>You are driving this route. Keep navigation logs open.</span>
                              </div>
                            )}
                          </div>

                          {/* Fare group */}
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                              ₹ {trip.fare}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              {isDriver ? ' earned' : ' total'}
                            </span>
                          </div>

                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* Sub-view: MY VEHICLE (Now fully relational) */}
          {currentHeaderTab === 'vehicle' && (
            <div className="dashboard-container" style={{ maxWidth: '800px' }}>
              
              <button className="back-header" onClick={() => setCurrentHeaderTab('dashboard')}>
                <ArrowLeft size={16} />
                <span>Dashboard</span>
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
                
                {/* Vehicles list column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>Registered Vehicles</h2>
                  
                  {isLoadingData ? (
                    <Loader2 className="animate-spin" size={24} style={{ margin: '20px auto' }} />
                  ) : userVehicles.length === 0 ? (
                    <div style={{ 
                      padding: '24px', 
                      backgroundColor: 'rgba(11, 15, 25, 0.4)', 
                      border: '1px dashed var(--border-color)', 
                      borderRadius: '8px', 
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '13px'
                    }}>
                      No vehicles registered yet. Add your vehicle using the form.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {userVehicles.map(vehicle => (
                        <div key={vehicle.id} style={{ 
                          backgroundColor: 'var(--bg-input)', 
                          border: '1px solid var(--border-color)', 
                          padding: '16px', 
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={{ color: vehicle.status === 'active' ? 'var(--color-brand)' : 'var(--text-muted)' }}>
                              <Car size={24} />
                            </div>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{vehicle.model}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Reg: {vehicle.registrationNumber} • {vehicle.seatingCapacity} seats</div>
                            </div>
                          </div>
                          
                          {/* Toggle switch for Active status */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                            <label className="toggle-wrapper" style={{ gap: '6px' }}>
                              <input
                                type="checkbox"
                                className="toggle-input"
                                checked={vehicle.status === 'active'}
                                onChange={() => handleToggleVehicleStatus(vehicle.id)}
                              />
                              <div className="toggle-switch" style={{ width: '38px', height: '20px' }}></div>
                              <span style={{ fontSize: '11px', color: vehicle.status === 'active' ? 'var(--color-brand)' : 'var(--text-muted)', fontWeight: '600' }}>
                                {vehicle.status === 'active' ? 'Active' : 'Inactive'}
                              </span>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add new vehicle form column */}
                <div style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>Register a Vehicle</h2>
                  
                  {vehicleSuccess && (
                    <div className="feedback-alert feedback-success" style={{ marginBottom: '16px' }}>
                      <Check size={16} />
                      <span>{vehicleSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleAddVehicle} className="auth-form" style={{ gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Vehicle Model</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        style={{ paddingLeft: '16px' }}
                        placeholder="e.g. Swift Dzire, Toyota Prius"
                        value={newModel}
                        onChange={(e) => setNewModel(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Registration Number</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        style={{ paddingLeft: '16px' }}
                        placeholder="e.g. GJ01AB1234"
                        value={newReg}
                        onChange={(e) => setNewReg(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Seating Capacity</label>
                      <select 
                        className="input-field seat-select"
                        value={newCapacity}
                        onChange={(e) => setNewCapacity(e.target.value)}
                        required
                      >
                        <option value="4">4 Seats</option>
                        <option value="5">5 Seats</option>
                        <option value="7">7 Seats</option>
                      </select>
                      <ChevronDown size={18} className="select-arrow-icon" />
                    </div>

                    <div className="form-group">
                      <label className="toggle-wrapper">
                        <input
                          type="checkbox"
                          className="toggle-input"
                          checked={newActive}
                          onChange={(e) => setNewActive(e.target.checked)}
                        />
                        <div className="toggle-switch"></div>
                        <span className="toggle-label">Mark as Active</span>
                      </label>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ height: '44px', fontSize: '14px' }}>
                      <Plus size={16} />
                      <span>Register Vehicle</span>
                    </button>
                  </form>
                </div>

              </div>

            </div>
          )}

          {/* Sub-view: RIDE HISTORY (Now fully relational) */}
          {currentHeaderTab === 'history' && (
            <div className="dashboard-container" style={{ maxWidth: '800px' }}>
              <button className="back-header" onClick={() => setCurrentHeaderTab('dashboard')}>
                <ArrowLeft size={16} />
                <span>Dashboard</span>
              </button>

              <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>Ride History</h2>
              
              {isLoadingData ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Loader2 className="animate-spin" size={28} style={{ margin: '0 auto' }} />
                </div>
              ) : historyTrips.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px 20px', 
                  backgroundColor: 'var(--bg-input)', 
                  border: '1px dashed var(--border-color)', 
                  borderRadius: '12px',
                  color: 'var(--text-secondary)'
                }}>
                  No completed or cancelled rides in your history.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {historyTrips.map(trip => {
                    const isDriver = trip.driverId === user?.id;
                    return (
                      <div key={trip.id} style={{ 
                        backgroundColor: 'var(--bg-input)', 
                        border: '1px solid var(--border-color)', 
                        padding: '16px 20px', 
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ 
                              fontSize: '11px', 
                              fontWeight: '600', 
                              padding: '2px 8px', 
                              borderRadius: '4px',
                              backgroundColor: isDriver ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                              color: isDriver ? 'var(--color-brand)' : '#3b82f6'
                            }}>
                              {isDriver ? 'Driver' : 'Passenger'}
                            </span>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                              {trip.ride?.pickupAddress} to {trip.ride?.destAddress}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {formatRideDate(trip.ride?.datetime)} • Status: {trip.status}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>₹ {trip.fare}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Sub-view: PLACEHOLDERS FOR Other TABS (Wallet, Setting) */}
          {['wallet', 'setting'].includes(currentHeaderTab) && (
            <div className="dashboard-container" style={{ maxWidth: '600px', alignItems: 'center', textAlign: 'center', padding: '48px 32px' }}>
              
              {currentHeaderTab === 'wallet' && (
                <>
                  <Wallet size={48} className="brand-logo" style={{ marginBottom: '16px' }} />
                  <h2>My Wallet</h2>
                  <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '15px' }}>
                    Current Balance: <strong style={{ color: 'var(--color-brand)', fontSize: '20px' }}>
                      ₹ {user?.wallet?.balance !== undefined ? user.wallet.balance : '500.00'}
                    </strong>
                  </p>
                  <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Transactions, recharges, and billing summaries will display here.</p>
                </>
              )}

              {currentHeaderTab === 'setting' && (
                <>
                  <Settings size={48} className="brand-logo" style={{ marginBottom: '16px' }} />
                  <h2>System Settings</h2>
                  <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Account preferences, notification parameters, and privacy controls.</p>
                </>
              )}

              <button className="btn btn-secondary" style={{ marginTop: '24px', height: '40px', padding: '0 20px' }} onClick={() => setCurrentHeaderTab('dashboard')}>
                Back to Dashboard
              </button>

            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default Dashboard;
