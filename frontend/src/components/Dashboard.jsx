import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, ArrowUpDown, Clock, Users, ChevronDown, Repeat, 
  DollarSign, Car, Calendar, Navigation, MessageSquare, 
  Phone, MapPin, MoreVertical, Plus, Trash2, Wallet, Settings, Activity,
  ArrowLeft, Check, Loader2, ArrowRight, Play, CheckCircle2, Send, PhoneOff
} from 'lucide-react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import Header from './Header';
import Sidebar from './Sidebar';

export const Dashboard = ({ onProfileClick, onNavigate, dashboardState }) => {
  const { user, token } = useAuth();
  
  // Dashboard Tabs (dashboard, trips, vehicle, history, wallet, setting)
  const [currentHeaderTab, setCurrentHeaderTab] = useState('dashboard');
  const [activeSearchTab, setActiveSearchTab] = useState('find'); // 'find' or 'offer'
  
  // Trip details drill-down state
  const [selectedTrip, setSelectedTrip] = useState(null);

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

  // Chat Panel states
  const [chatMessages, setChatMessages] = useState([]);
  const [typedMessage, setTypedMessage] = useState('');
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);

  // Simulated calling modal state
  const [callingUser, setCallingUser] = useState(null);

  // Add Vehicle Form States
  const [newModel, setNewModel] = useState('');
  const [newReg, setNewReg] = useState('');
  const [newCapacity, setNewCapacity] = useState('4');
  const [newActive, setNewActive] = useState(true);
  const [vehicleSuccess, setVehicleSuccess] = useState('');

  // Sync tab with external navigation state updates
  useEffect(() => {
    if (dashboardState?.activeTab) {
      setCurrentHeaderTab(dashboardState.activeTab);
    }
  }, [dashboardState]);

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
        if (activeCar && !selectedVehicle) {
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

  const fetchChatHistory = async (tripId) => {
    if (!token || !tripId) return;
    try {
      const res = await fetch(`/api/trips/${tripId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data);
      }
    } catch (err) {
      console.error('Failed to fetch chat history', err);
    }
  };

  // Sync data loaders on mount + 5s client polling loop
  useEffect(() => {
    if (!token) return;

    fetchVehicles();
    fetchTrips();
    fetchHistory();

    const interval = setInterval(() => {
      fetchTrips();
      fetchHistory();
    }, 5000);

    return () => clearInterval(interval);
  }, [token]);

  // Sync selected trip drill-down with latest polled activeTrips changes
  useEffect(() => {
    if (selectedTrip) {
      const updated = activeTrips.find(t => t.id === selectedTrip.id);
      if (updated) {
        setSelectedTrip(updated);
      }
    }
  }, [activeTrips]);

  // Socket.io Connect/Disconnect hook for Chat Namespace
  useEffect(() => {
    if (!token || !selectedTrip) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setChatMessages([]);
      return;
    }

    // Fetch previous persistent chat history
    fetchChatHistory(selectedTrip.id);

    // Connect to /chat namespace
    const socket = io('/chat');
    socketRef.current = socket;

    socket.emit('join:trip', selectedTrip.id);

    const handleIncomingMsg = (msg) => {
      setChatMessages((prev) => {
        // De-duplicate incoming messages
        if (prev.some((m) => m.id === msg.id)) {
          return prev;
        }
        return [...prev, msg];
      });
    };

    socket.on('message:new', handleIncomingMsg);
    socket.on('message:receive', handleIncomingMsg);

    return () => {
      socket.off('message:new', handleIncomingMsg);
      socket.off('message:receive', handleIncomingMsg);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [selectedTrip, token]);

  // Auto-scroll chat history viewport
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

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

  // Driver status controls: Call PATCH status transitions
  const handleUpdateStatus = async (tripId, nextStatus) => {
    setIsLoadingData(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to advance trip status.');
      }

      alert(`Trip status advanced successfully to: ${nextStatus === 'completed' ? 'payment pending' : nextStatus}`);
      await fetchTrips();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Passenger Pay Now control
  const handlePayment = async (tripId) => {
    setIsLoadingData(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'payment_completed' })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to process payment.');
      }

      alert('Payment confirmed! Enjoyed your ride.');
      setSelectedTrip(null);
      await fetchTrips();
      await fetchHistory();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Chat message emit handler
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!typedMessage.trim() || !socketRef.current || !selectedTrip) return;

    socketRef.current.emit('message:send', {
      tripId: selectedTrip.id,
      senderId: user.id,
      text: typedMessage.trim()
    });

    setTypedMessage('');
  };

  const focusChatInput = () => {
    if (chatInputRef.current) {
      chatInputRef.current.focus();
      chatInputRef.current.scrollIntoView({ behavior: 'smooth' });
    }
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

  // Helper to determine status badge styling
  const getStatusBadge = (status) => {
    let bg = 'rgba(107, 114, 128, 0.15)';
    let color = '#6b7280';
    let text = status;

    switch (status) {
      case 'booked':
        bg = 'rgba(59, 130, 246, 0.15)';
        color = '#3b82f6';
        text = 'Booked';
        break;
      case 'started':
        bg = 'rgba(249, 115, 22, 0.15)';
        color = '#f97316';
        text = 'Started';
        break;
      case 'in_progress':
        bg = 'rgba(6, 182, 212, 0.15)';
        color = '#06b6d4';
        text = 'In Progress';
        break;
      case 'completed':
        bg = 'rgba(16, 185, 129, 0.15)';
        color = '#10b981';
        text = 'Completed';
        break;
      case 'payment_pending':
        bg = 'rgba(239, 68, 68, 0.15)';
        color = '#ef4444';
        text = 'Payment Pending';
        break;
      case 'payment_completed':
        bg = 'rgba(16, 185, 129, 0.15)';
        color = '#10b981';
        text = 'Payment Completed';
        break;
    }

    return (
      <span style={{ 
        fontSize: '11px', 
        fontWeight: '600', 
        padding: '3px 8px', 
        borderRadius: '4px',
        backgroundColor: bg,
        color: color,
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {text}
      </span>
    );
  };

  // Helper to determine sidebar text rotation label
  const getSidebarLabel = () => {
    if (currentHeaderTab === 'trips' && selectedTrip) {
      if (selectedTrip.status === 'payment_pending') {
        return 'Trip Finish';
      }
      return 'Trip Detail';
    }
    
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
        setCurrentTab={(tabId) => {
          setCurrentHeaderTab(tabId);
          setSelectedTrip(null); 
        }}
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

          {/* Sub-view: MY TRIPS - DRILLDOWN AND CARD LISTS */}
          {currentHeaderTab === 'trips' && (
            <div className="dashboard-container" style={{ maxWidth: '800px' }}>
              
              {/* Scenario 1: Drill-down Details Sub-screen */}
              {selectedTrip ? (
                <>
                  {/* Back header navigation */}
                  <button 
                    className="back-header" 
                    onClick={() => setSelectedTrip(null)}
                    style={{ marginBottom: '16px' }}
                  >
                    <ArrowLeft size={16} />
                    <span>{selectedTrip.status === 'payment_pending' ? 'Trip Finish' : 'Trip Detail'}</span>
                  </button>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
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
                      {/* 3-dots actions icon */}
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

                      {/* Metadata Header Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ 
                          fontSize: '11px', 
                          fontWeight: '700', 
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          padding: '3px 10px', 
                          borderRadius: '4px',
                          backgroundColor: (selectedTrip.driverId === user?.id) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          color: (selectedTrip.driverId === user?.id) ? 'var(--color-brand)' : '#3b82f6'
                        }}>
                          {(selectedTrip.driverId === user?.id) ? 'Driver Mode' : 'Passenger Mode'}
                        </span>
                        {getStatusBadge(selectedTrip.status)}
                      </div>

                      {/* Profiles Row */}
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
                          {selectedTrip.driverId === user?.id ? (
                            <>
                              <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>You (Driver)</h2>
                              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                Passenger Bookings: {selectedTrip.passengers?.length > 0 
                                  ? selectedTrip.passengers.map(p => p.user?.name).join(', ') 
                                  : 'None yet.'}
                              </div>
                            </>
                          ) : (
                            <>
                              <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                                {selectedTrip.driver?.name || 'Carpool Driver'}
                              </h2>
                              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                Route: {selectedTrip.ride?.pickupAddress} to {selectedTrip.ride?.destAddress}
                              </div>
                            </>
                          )}
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {formatRideDate(selectedTrip.ride?.datetime)}
                          </div>
                        </div>
                      </div>

                      {/* Route Details Grid */}
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr 1fr', 
                        gap: '16px', 
                        backgroundColor: 'rgba(11, 15, 25, 0.4)', 
                        padding: '20px', 
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)' 
                      }}>
                        <div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '8px' }}>Vehicle</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                            <Car size={18} className="brand-logo" />
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: '600' }}>{selectedTrip.vehicle?.model || 'Toyota Prius'}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selectedTrip.vehicle?.registrationNumber || 'GJ01AB1234'}</div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '8px' }}>Pick UP Point</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                            <MapPin size={18} style={{ color: '#3b82f6' }} />
                            <div style={{ fontSize: '14px', fontWeight: '600' }}>{selectedTrip.ride?.pickupAddress}</div>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '8px' }}>Drop Point</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                            <MapPin size={18} style={{ color: 'var(--color-brand)' }} />
                            <div style={{ fontSize: '14px', fontWeight: '600' }}>{selectedTrip.ride?.destAddress}</div>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Bar: Action buttons and Price */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        flexWrap: 'wrap', 
                        gap: '16px', 
                        borderTop: '1px solid var(--border-color)', 
                        paddingTop: '20px' 
                      }}>
                        
                        {/* Driver Status Transition Controls */}
                        {selectedTrip.driverId === user?.id ? (
                          <div style={{ display: 'flex', gap: '12px' }}>
                            {selectedTrip.status === 'booked' && (
                              <button 
                                className="btn btn-primary"
                                style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '42px', padding: '0 16px' }}
                                onClick={() => handleUpdateStatus(selectedTrip.id, 'started')}
                              >
                                <Play size={16} />
                                <span>Start Trip</span>
                              </button>
                            )}
                            
                            {selectedTrip.status === 'started' && (
                              <button 
                                className="btn btn-primary"
                                style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '42px', padding: '0 16px' }}
                                onClick={() => handleUpdateStatus(selectedTrip.id, 'in_progress')}
                              >
                                <Play size={16} />
                                <span>Set In Progress</span>
                              </button>
                            )}
                            
                            {selectedTrip.status === 'in_progress' && (
                              <button 
                                className="btn btn-primary"
                                style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '42px', padding: '0 16px' }}
                                onClick={() => handleUpdateStatus(selectedTrip.id, 'completed')}
                              >
                                <CheckCircle2 size={16} />
                                <span>Complete Trip</span>
                              </button>
                            )}

                            {selectedTrip.status === 'payment_pending' && (
                              <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                ⏱️ Awaiting passenger payment confirmation...
                              </span>
                            )}
                          </div>
                        ) : (
                          /* Passenger Controls & Pay Now button */
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            {selectedTrip.status === 'payment_pending' ? (
                              <button 
                                className="btn btn-primary animate-pulse"
                                style={{ height: '42px', padding: '0 24px', fontSize: '13px', fontWeight: '700' }}
                                onClick={() => handlePayment(selectedTrip.id)}
                              >
                                PaY Now
                              </button>
                            ) : (
                              <>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ height: '42px', padding: '0 16px', fontSize: '13px' }}
                                  onClick={focusChatInput}
                                >
                                  <MessageSquare size={16} />
                                  <span>Chat</span>
                                </button>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ height: '42px', padding: '0 16px', fontSize: '13px' }}
                                  onClick={() => setCallingUser(selectedTrip.driver?.name || 'Carpool Driver')}
                                >
                                  <Phone size={16} />
                                  <span>Call</span>
                                </button>
                                <button 
                                  className="btn btn-primary" 
                                  style={{ height: '42px', padding: '0 16px', fontSize: '13px' }}
                                  onClick={() => onNavigate('track-ride', {
                                    pickupLocation: selectedTrip.ride?.pickupAddress,
                                    destination: selectedTrip.ride?.destAddress,
                                    driverName: selectedTrip.driver?.name,
                                    vehicleName: selectedTrip.vehicle?.model,
                                    vehicleReg: selectedTrip.vehicle?.registrationNumber
                                  })}
                                >
                                  <Navigation size={16} />
                                  <span>Track Ride</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        {/* Driver Calling button (if driver wants to call the passenger) */}
                        {selectedTrip.driverId === user?.id && selectedTrip.passengers?.length > 0 && (
                          <button 
                            className="btn btn-secondary" 
                            style={{ height: '42px', padding: '0 16px', fontSize: '13px' }}
                            onClick={() => setCallingUser(selectedTrip.passengers[0].user?.name || 'Passenger')}
                          >
                            <Phone size={16} />
                            <span>Call Passenger</span>
                          </button>
                        )}

                        {/* Fare details */}
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
                            ₹ {selectedTrip.fare}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {selectedTrip.driverId === user?.id ? ' earnings' : ' fare'}
                          </span>
                        </div>

                      </div>
                    </div>

                    {/* Chat Panel Card (Screen 13 Bubble Layout matching) */}
                    {selectedTrip.status !== 'payment_pending' && selectedTrip.status !== 'payment_completed' && (
                      <div style={{ 
                        backgroundColor: 'var(--bg-input)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: 'var(--radius-lg)', 
                        padding: '24px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '16px',
                        boxShadow: 'var(--shadow-sm)'
                      }}>
                        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                            Trip Chat
                          </h3>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--color-brand)', borderRadius: '50%' }}></span>
                            <span>Connected</span>
                          </span>
                        </div>

                        {/* Message list bubble container */}
                        <div style={{ 
                          height: '240px', 
                          overflowY: 'auto', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '12px', 
                          paddingRight: '8px'
                        }}>
                          {chatMessages.length === 0 ? (
                            <div style={{ 
                              margin: 'auto', 
                              textAlign: 'center', 
                              color: 'var(--text-muted)', 
                              fontSize: '12px',
                              padding: '20px'
                            }}>
                              No messages yet. Send a note to coordinate departure!
                            </div>
                          ) : (
                            chatMessages.map((msg, index) => {
                              const isOwn = msg.senderId === user?.id;
                              return (
                                <div 
                                  key={msg.id || index}
                                  style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    alignItems: isOwn ? 'flex-end' : 'flex-start',
                                    maxWidth: '80%',
                                    alignSelf: isOwn ? 'flex-end' : 'flex-start'
                                  }}
                                >
                                  {/* Bubble content */}
                                  <div style={{ 
                                    padding: '10px 14px', 
                                    borderRadius: '16px', 
                                    borderTopRightRadius: isOwn ? '2px' : '16px',
                                    borderTopLeftRadius: isOwn ? '16px' : '2px',
                                    fontSize: '13px', 
                                    lineHeight: '1.4',
                                    backgroundColor: isOwn ? 'var(--color-brand)' : 'var(--bg-card)', 
                                    color: isOwn ? '#fff' : 'var(--text-primary)',
                                    border: isOwn ? 'none' : '1px solid var(--border-color)',
                                    wordBreak: 'break-word'
                                  }}>
                                    {msg.text}
                                  </div>
                                  {/* Sender metadata / timestamp */}
                                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', padding: '0 4px' }}>
                                    {!isOwn && `${msg.sender?.name || 'User'} • `}
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              );
                            })
                          )}
                          <div ref={messagesEndRef} />
                        </div>

                        {/* Input bar */}
                        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                          <input 
                            type="text"
                            className="input-field"
                            style={{ flex: 1, paddingLeft: '16px', height: '42px', fontSize: '13px' }}
                            placeholder="Type your message here..."
                            value={typedMessage}
                            onChange={(e) => setTypedMessage(e.target.value)}
                            ref={chatInputRef}
                          />
                          <button 
                            type="submit" 
                            className="btn btn-primary"
                            style={{ width: '42px', height: '42px', padding: 0, borderRadius: '50%', justifyContent: 'center' }}
                            disabled={!typedMessage.trim()}
                          >
                            <Send size={16} />
                          </button>
                        </form>

                      </div>
                    )}

                  </div>
                </>
              ) : (
                /* Scenario 2: Active Trips List (Screen 11 Card Listing) */
                <>
                  <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>My Active Trips</h2>

                  {isLoadingData && activeTrips.length === 0 ? (
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {activeTrips.map((trip) => {
                        const isDriver = trip.driverId === user?.id;
                        return (
                          <div 
                            key={trip.id}
                            className="ride-card-hover"
                            onClick={() => setSelectedTrip(trip)}
                            style={{ 
                              backgroundColor: 'var(--bg-input)', 
                              border: '1px solid var(--border-color)', 
                              borderRadius: 'var(--radius-md)', 
                              padding: '20px', 
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <div style={{ 
                                width: '42px', 
                                height: '42px', 
                                borderRadius: '50%', 
                                backgroundColor: 'var(--bg-card)', 
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-secondary)'
                              }}>
                                <Users size={20} />
                              </div>
                              <div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                  <span style={{ 
                                    fontSize: '10px', 
                                    fontWeight: '700', 
                                    padding: '2px 6px', 
                                    borderRadius: '3px',
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
                                  {formatRideDate(trip.ride?.datetime)}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                                {getStatusBadge(trip.status)}
                                <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                  ₹ {trip.fare}
                                </div>
                              </div>
                              <ArrowRight size={18} style={{ color: 'var(--text-muted)' }} />
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
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
                  
                  {isLoadingData && userVehicles.length === 0 ? (
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
              
              {isLoadingData && historyTrips.length === 0 ? (
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

      {/* Simulated Calling Modal overlay */}
      {callingUser && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          backgroundColor: 'rgba(5, 8, 15, 0.9)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 9999,
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{ 
            backgroundColor: 'var(--bg-input)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '24px', 
            width: '320px', 
            padding: '40px 24px', 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
          }}>
            {/* Pulsing avatar */}
            <div className="calling-avatar-ring">
              <div style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                border: '2px solid var(--color-brand)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-brand)'
              }}>
                <Users size={36} />
              </div>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700' }}>
                Calling...
              </span>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)', margin: '8px 0 0 0' }}>
                {callingUser}
              </h3>
            </div>

            {/* End Call red button */}
            <button 
              className="btn" 
              onClick={() => setCallingUser(null)}
              style={{ 
                width: '56px', 
                height: '56px', 
                borderRadius: '50%', 
                backgroundColor: '#ef4444', 
                color: '#fff', 
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)'
              }}
            >
              <PhoneOff size={24} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
