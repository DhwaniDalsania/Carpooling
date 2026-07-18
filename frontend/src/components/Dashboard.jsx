import React, { useState } from 'react';
import { Search, ArrowUpDown, Clock, Users, ChevronDown, Repeat, Star, Check, Loader2, Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Header from './Header';
import Sidebar from './Sidebar';

export const Dashboard = ({ onProfileClick }) => {
  const { user } = useAuth();
  
  // Dashboard Tabs
  const [currentHeaderTab, setCurrentHeaderTab] = useState('trips');
  const [activeSearchTab, setActiveSearchTab] = useState('find'); // 'find' or 'offer'

  // Find Ride Form States
  const [startLoc, setStartLoc] = useState('');
  const [destLoc, setDestLoc] = useState('');
  const [dateTime, setDateTime] = useState('2026-07-18T17:12'); // default 18 Jul, 5:12 PM
  const [seats, setSeats] = useState('1');
  const [isRecurring, setIsRecurring] = useState(true);

  // Offer Ride Form States
  const [offerStart, setOfferStart] = useState('');
  const [offerDest, setOfferDest] = useState('');
  const [offerDateTime, setOfferDateTime] = useState('2026-07-18T17:12');
  const [offerSeats, setOfferSeats] = useState('3');
  const [offerPrice, setOfferPrice] = useState('10');

  // Search results state
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [offerSuccess, setOfferSuccess] = useState('');

  // Swap Locations function
  const handleSwapLocations = () => {
    if (activeSearchTab === 'find') {
      const temp = startLoc;
      setStartLoc(destLoc);
      setDestLoc(temp);
    } else {
      const temp = offerStart;
      setOfferStart(offerDest);
      setOfferDest(temp);
    }
  };

  // Format Date for Display
  const formatDisplayDate = (dateTimeStr) => {
    try {
      const date = new Date(dateTimeStr);
      if (isNaN(date.getTime())) return 'Select Date & Time';
      
      const day = date.getDate();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      
      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      
      return `${day} ${month}, ${hours}:${minutes}${ampm}`;
    } catch {
      return dateTimeStr;
    }
  };

  // Find Ride Submission
  const handleFindRide = (e) => {
    e.preventDefault();
    setIsSearching(true);
    setSearchResults(null);

    // Simulate search latency
    setTimeout(() => {
      setIsSearching(false);
      // Generate realistic mock results matching locations entered
      setSearchResults([
        {
          id: 1,
          driver: 'Sarah Jenkins',
          rating: '4.9',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100',
          time: 'Departing in 15 mins (' + formatDisplayDate(new Date(Date.now() + 15 * 60000).toISOString()) + ')',
          price: '$12.50',
          seatsLeft: 2,
          car: 'Tesla Model 3'
        },
        {
          id: 2,
          driver: 'David Chen',
          rating: '4.7',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100',
          time: 'Departing in 40 mins (' + formatDisplayDate(new Date(Date.now() + 40 * 60000).toISOString()) + ')',
          price: '$8.00',
          seatsLeft: 3,
          car: 'Toyota Prius'
        },
        {
          id: 3,
          driver: 'Elena Rostova',
          rating: '5.0',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100',
          time: 'Departing in 1 hour (' + formatDisplayDate(new Date(Date.now() + 60 * 60000).toISOString()) + ')',
          price: '$15.00',
          seatsLeft: 1,
          car: 'Honda Civic'
        }
      ]);
    }, 800);
  };

  // Offer Ride Submission
  const handleOfferRide = (e) => {
    e.preventDefault();
    setIsSearching(true);
    setOfferSuccess('');

    setTimeout(() => {
      setIsSearching(false);
      setOfferSuccess(`Ride offered successfully from ${offerStart || 'Start'} to ${offerDest || 'Destination'}!`);
      // Reset form
      setOfferStart('');
      setOfferDest('');
    }, 700);
  };

  return (
    <div className="app-container animate-fade-in">
      {/* Header with Navigation tabs */}
      <Header
        onProfileClick={onProfileClick}
        currentTab={currentHeaderTab}
        setCurrentTab={setCurrentHeaderTab}
        showTabs={true}
      />

      {/* Main body with sidebar and dashboard panel */}
      <div className="app-body-wrapper">
        <Sidebar label="Carpooling" />

        <main className="app-content-area">
          <div className="dashboard-container">
            {/* Find Ride / Offer Ride Selector Tabs */}
            <div className="dashboard-toggle-tabs">
              <button
                className={`tab-toggle-btn ${activeSearchTab === 'find' ? 'active' : ''}`}
                onClick={() => {
                  setActiveSearchTab('find');
                  setSearchResults(null);
                  setOfferSuccess('');
                }}
              >
                Find Ride
              </button>
              <button
                className={`tab-toggle-btn ${activeSearchTab === 'offer' ? 'active' : ''}`}
                onClick={() => {
                  setActiveSearchTab('offer');
                  setSearchResults(null);
                  setOfferSuccess('');
                }}
              >
                Offer Ride
              </button>
            </div>

            {/* Success Offer message */}
            {offerSuccess && (
              <div className="feedback-alert feedback-success">
                <Check size={18} />
                {offerSuccess}
              </div>
            )}

            {/* Find Ride Form */}
            {activeSearchTab === 'find' && (
              <form onSubmit={handleFindRide} className="auth-form">
                
                {/* Location row with swap button */}
                <div className="locations-container">
                  {/* Start Location */}
                  <div className="form-group">
                    <label className="form-label">Start Location</label>
                    <div className="input-icon-wrapper">
                      <div className="input-icon-left">
                        <Search size={18} />
                      </div>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Enter Your location"
                        value={startLoc}
                        onChange={(e) => setStartLoc(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Swap Button */}
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

                  {/* Destination Location */}
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

                {/* Date & Seats Row */}
                <div className="form-row-2col">
                  {/* Date & Time Picker */}
                  <div className="form-group">
                    <label className="form-label">Date & Time</label>
                    <div className="input-icon-wrapper">
                      <div className="input-icon-left">
                        <Clock size={18} />
                      </div>
                      {/* Hidden native input overlayed with styled text */}
                      <input
                        type="datetime-local"
                        className="input-field"
                        value={dateTime}
                        onChange={(e) => setDateTime(e.target.value)}
                        required
                        style={{ paddingRight: '12px' }}
                      />
                    </div>
                  </div>

                  {/* Seat requirements */}
                  <div className="form-group">
                    <label className="form-label">Seat Requirement</label>
                    <div className="input-icon-wrapper seat-select-wrapper">
                      <div className="input-icon-left">
                        <Users size={18} />
                      </div>
                      <select
                        className="input-field seat-select"
                        value={seats}
                        onChange={(e) => setSeats(e.target.value)}
                      >
                        <option value="1">Seat 1</option>
                        <option value="2">Seat 2</option>
                        <option value="3">Seat 3</option>
                        <option value="4">Seat 4</option>
                      </select>
                      <ChevronDown size={18} className="select-arrow-icon" />
                    </div>
                  </div>
                </div>

                {/* Recurring Ride Switch */}
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

                {/* Submit button */}
                <button type="submit" className="btn btn-primary" disabled={isSearching}>
                  {isSearching ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>Searching for rides...</span>
                    </>
                  ) : (
                    <span>Find Ride</span>
                  )}
                </button>
              </form>
            )}

            {/* Offer Ride Form */}
            {activeSearchTab === 'offer' && (
              <form onSubmit={handleOfferRide} className="auth-form">
                <div className="locations-container">
                  {/* Start Location */}
                  <div className="form-group">
                    <label className="form-label">Start Location</label>
                    <div className="input-icon-wrapper">
                      <div className="input-icon-left">
                        <Search size={18} />
                      </div>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Enter departure point"
                        value={offerStart}
                        onChange={(e) => setOfferStart(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Swap Button */}
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

                  {/* Destination Location */}
                  <div className="form-group">
                    <label className="form-label">Destination Location</label>
                    <div className="input-icon-wrapper">
                      <div className="input-icon-left">
                        <Search size={18} />
                      </div>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Enter arrival point"
                        value={offerDest}
                        onChange={(e) => setOfferDest(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="form-row-2col">
                  {/* Date & Time */}
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

                  {/* Seat availability */}
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

                <div className="form-group">
                  <label className="form-label">Price per Seat ($)</label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    style={{ paddingLeft: '16px' }}
                    placeholder="Enter price per seat"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={isSearching}>
                  {isSearching ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>Posting offer...</span>
                    </>
                  ) : (
                    <span>Offer Ride</span>
                  )}
                </button>
              </form>
            )}

            {/* Results Display */}
            {searchResults && activeSearchTab === 'find' && (
              <div className="results-section animate-fade-in">
                <div className="results-header">
                  <Compass size={18} className="brand-logo" />
                  <span>Available Rides ({searchResults.length})</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {searchResults.map((ride) => (
                    <div key={ride.id} className="ride-card">
                      <div className="ride-driver-info">
                        <div className="ride-driver-photo">
                          <img src={ride.avatar} alt={ride.driver} className="ride-driver-img" />
                        </div>
                        <div>
                          <div className="ride-driver-name">{ride.driver}</div>
                          <div className="ride-driver-rating">
                            <Star size={12} fill="currentColor" />
                            <span>{ride.rating}</span>
                            <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>• {ride.car}</span>
                          </div>
                        </div>
                      </div>

                      <div className="ride-details">
                        <span className="ride-time">{ride.time}</span>
                        <span className="ride-seats-left">{ride.seatsLeft} seat(s) left</span>
                        <span className="ride-price">{ride.price}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
