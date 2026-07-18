import React, { useState, useEffect } from 'react';
import { 
  Search, ArrowUpDown, Clock, Users, ChevronDown, Repeat, 
  DollarSign, Car, Calendar, Navigation, MessageSquare, 
  Phone, MapPin, MoreVertical, Plus, Trash2, Wallet, Settings, Activity,
  ArrowLeft, Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Header from './Header';
import Sidebar from './Sidebar';

export const Dashboard = ({ onProfileClick, onNavigate, dashboardState }) => {
  const { user } = useAuth();
  
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
  const [selectedVehicle, setSelectedVehicle] = useState('v1');

  // Stub of user's registered vehicles
  const [userVehicles, setUserVehicles] = useState([
    { id: 'v1', model: 'Toyota Prius', regNumber: 'GJ01AB1234', capacity: 4, status: 'active' },
    { id: 'v2', model: 'Tesla Model 3', regNumber: 'GJ01CD5678', capacity: 4, status: 'active' },
    { id: 'v3', model: 'Honda Civic', regNumber: 'GJ01EF9012', capacity: 5, status: 'inactive' }
  ]);

  // Add Vehicle Form States
  const [newModel, setNewModel] = useState('');
  const [newReg, setNewReg] = useState('');
  const [newCapacity, setNewCapacity] = useState('4');
  const [newActive, setNewActive] = useState(true);
  const [vehicleSuccess, setVehicleSuccess] = useState('');

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
      vehicle: selectedCar ? `${selectedCar.model} (${selectedCar.regNumber})` : 'Registered Vehicle'
    });
  };

  // Add Vehicle Submit
  const handleAddVehicle = (e) => {
    e.preventDefault();
    if (!newModel.trim() || !newReg.trim() || !newCapacity) {
      alert('All fields are required');
      return;
    }

    const newCar = {
      id: 'v' + (userVehicles.length + 1),
      model: newModel,
      regNumber: newReg,
      capacity: parseInt(newCapacity),
      status: newActive ? 'active' : 'inactive'
    };

    setUserVehicles([...userVehicles, newCar]);
    setNewModel('');
    setNewReg('');
    setNewCapacity('4');
    setNewActive(true);
    setVehicleSuccess('Vehicle added successfully!');
    setTimeout(() => setVehicleSuccess(''), 2000);
  };

  const handleToggleVehicleStatus = (id) => {
    setUserVehicles(userVehicles.map(v => {
      if (v.id === id) {
        return { ...v, status: v.status === 'active' ? 'inactive' : 'active' };
      }
      return v;
    }));
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
                          {userVehicles
                            .filter(v => v.status === 'active')
                            .map((vehicle) => (
                              <option key={vehicle.id} value={vehicle.id}>
                                {vehicle.model} ({vehicle.regNumber})
                              </option>
                            ))}
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

          {/* Sub-view: MY TRIPS - TRIP DETAILS (Matches Image 3 Exactly) */}
          {currentHeaderTab === 'trips' && (
            <div className="dashboard-container" style={{ maxWidth: '800px' }}>
              
              {/* Back Link "< Trip Detail" */}
              <button className="back-header" onClick={() => setCurrentHeaderTab('dashboard')}>
                <ArrowLeft size={16} />
                <span>Trip Detail</span>
              </button>

              {/* Trip Details main Card */}
              <div style={{ 
                backgroundColor: 'var(--bg-input)', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--radius-lg)', 
                padding: '28px', 
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                position: 'relative'
              }}>
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

                {/* Driver Details Row */}
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
                    <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>Raj Patel</h2>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>iskcon to Infocity</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>07:00 PM 18/July/26</div>
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
                        <div style={{ fontSize: '14px', fontWeight: '600' }}>Swift Dzire</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>GJ01AB1234</div>
                      </div>
                    </div>
                  </div>

                  {/* Pick Up Point Column */}
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '8px' }}>Pick UP Point</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                      <MapPin size={18} style={{ color: '#3b82f6' }} />
                      <div style={{ fontSize: '14px', fontWeight: '600' }}>Iskcon</div>
                    </div>
                  </div>

                  {/* Drop Point Column */}
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '8px' }}>Drop Point</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                      <MapPin size={18} style={{ color: 'var(--color-brand)' }} />
                      <div style={{ fontSize: '14px', fontWeight: '600' }}>Infocity</div>
                    </div>
                  </div>
                </div>

                {/* Communication and Price bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                  
                  {/* Buttons group */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn btn-secondary" style={{ height: '42px', padding: '0 16px', fontSize: '13px' }}>
                      <MessageSquare size={16} />
                      <span>Chat with Driver</span>
                    </button>
                    <button className="btn btn-secondary" style={{ height: '42px', padding: '0 16px', fontSize: '13px' }}>
                      <Phone size={16} />
                      <span>Call To Driver</span>
                    </button>
                  </div>

                  {/* Fare group */}
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>₹ 120</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}> / Seat 1</span>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* Sub-view: MY VEHICLE (Matches Screen 10 / Registered Vehicle structures) */}
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
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Reg: {vehicle.regNumber} • {vehicle.capacity} seats</div>
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

          {/* Sub-view: PLACEHOLDERS FOR OTHER TABS (History, Wallet, Setting) */}
          {['history', 'wallet', 'setting'].includes(currentHeaderTab) && (
            <div className="dashboard-container" style={{ maxWidth: '600px', alignItems: 'center', textAlign: 'center', padding: '48px 32px' }}>
              
              {currentHeaderTab === 'history' && (
                <>
                  <Activity size={48} className="brand-logo" style={{ marginBottom: '16px' }} />
                  <h2>Ride History</h2>
                  <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Log of completed trips and ride statistics will display here.</p>
                </>
              )}

              {currentHeaderTab === 'wallet' && (
                <>
                  <Wallet size={48} className="brand-logo" style={{ marginBottom: '16px' }} />
                  <h2>My Wallet</h2>
                  <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '15px' }}>Current Balance: <strong style={{ color: 'var(--color-brand)', fontSize: '20px' }}>$50.00</strong></p>
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
