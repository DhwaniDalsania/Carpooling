import React, { useState } from 'react';
import { ArrowLeft, User, MoreVertical, RefreshCw, Check, Loader2, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Header from './Header';
import Sidebar from './Sidebar';

export const AvailableRides = ({ routeState, onBack, onProfileClick, onNavigate }) => {
  const { token } = useAuth();
  
  // States
  const [currentHeaderTab, setCurrentHeaderTab] = useState('dashboard');
  const [isBookingId, setIsBookingId] = useState(null); // stores active booking ride ID
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Extract results and query parameters from routeState
  const matchingRides = routeState?.rides || [];
  const query = routeState?.searchQuery || {};

  // Book a ride
  const handleBookNow = async (rideId) => {
    setIsBookingId(rideId);
    setErrorMsg('');
    setBookingSuccess('');

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rideId,
          seatsBooked: parseInt(query.seats, 10) || 1
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to book the ride.');
      }

      setBookingSuccess('Booking confirmed! Redirecting to My Trips...');
      
      // Navigate to My Trips screen (dashboard screen, trips tab) after 1.5s
      setTimeout(() => {
        setBookingSuccess('');
        onNavigate('dashboard', { activeTab: 'trips' });
      }, 1500);

    } catch (err) {
      console.error('[bookingError]', err);
      setErrorMsg(err.message || 'Booking failed. Please try again.');
    } finally {
      setIsBookingId(null);
    }
  };

  // Re-fetch / Refresh matching rides list
  const handleRefresh = async () => {
    setErrorMsg('');
    try {
      const response = await fetch(
        `/api/rides/search?pickupLat=${query.pickupLat}&pickupLng=${query.pickupLng}&destLat=${query.destLat}&destLng=${query.destLng}&seats=${query.seats}&date=${query.date}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Refresh failed.');
      }

      // Refresh routeState parameters
      onNavigate('available-rides', {
        rides: data,
        searchQuery: query
      });
    } catch (err) {
      console.error('[refreshRidesError]', err);
      setErrorMsg('Failed to reload matching rides.');
    }
  };

  // Format datetime string for presentation card
  const formatRideDate = (datetimeStr) => {
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

  return (
    <div className="app-container animate-fade-in">
      {/* Header Bar */}
      <Header
        onProfileClick={onProfileClick}
        currentTab={currentHeaderTab}
        setCurrentTab={(tabId) => onNavigate('dashboard', { activeTab: tabId })}
        showTabs={true}
      />

      {/* Main Layout wrapper */}
      <div className="app-body-wrapper">
        <Sidebar label="Dashboard" />

        <main className="app-content-area">
          <div className="dashboard-container" style={{ maxWidth: '820px' }}>
            
            {/* Back link "< Available Ride" */}
            <button className="back-header" onClick={onBack}>
              <ArrowLeft size={16} />
              <span>Available Ride</span>
            </button>

            {/* Error Message display */}
            {errorMsg && (
              <div className="feedback-alert feedback-error">
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Message display */}
            {bookingSuccess && (
              <div className="feedback-alert feedback-success">
                <Check size={18} />
                <span>{bookingSuccess}</span>
              </div>
            )}

            {/* Rides Listing container */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
              {matchingRides.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px 20px', 
                  backgroundColor: 'var(--bg-input)', 
                  border: '1px dashed var(--border-color)', 
                  borderRadius: '12px',
                  color: 'var(--text-secondary)'
                }}>
                  No active rides found matching your coordinates. Click Refresh below to check again or post an offer.
                </div>
              ) : (
                matchingRides.map((ride) => (
                  <div 
                    key={ride.id} 
                    style={{ 
                      backgroundColor: 'var(--bg-input)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: 'var(--radius-lg)', 
                      padding: '24px', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      position: 'relative',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    
                    {/* Far-right 3-dots actions menu button */}
                    <button style={{ 
                      position: 'absolute', 
                      top: '20px', 
                      right: '20px', 
                      background: 'none', 
                      border: 'none', 
                      color: 'var(--text-muted)', 
                      cursor: 'pointer' 
                    }}>
                      <MoreVertical size={18} />
                    </button>

                    {/* Driver details (left) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '50%', 
                        backgroundColor: 'var(--bg-card)', 
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-secondary)',
                        overflow: 'hidden'
                      }}>
                        {ride.driver?.photoUrl ? (
                          <img src={ride.driver.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <User size={24} />
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
                          {ride.driver?.name || 'Carpool Driver'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {ride.pickupAddress} to {ride.destAddress}
                        </div>
                        {ride.vehicle && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            🚘 {ride.vehicle.model} ({ride.vehicle.registrationNumber})
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pricing, schedule and Book button (right) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', paddingRight: '20px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {formatRideDate(ride.datetime)}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginTop: '4px' }}>
                          ₹ {ride.farePerSeat} <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '400' }}>/ Seat {ride.availableSeats} Available</span>
                        </div>
                      </div>

                      <button 
                        className="btn btn-primary" 
                        style={{ height: '42px', padding: '0 20px', fontSize: '13px', borderRadius: '8px' }}
                        onClick={() => handleBookNow(ride.id)}
                        disabled={isBookingId !== null}
                      >
                        {isBookingId === ride.id ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          <span>Book Now</span>
                        )}
                      </button>
                    </div>

                  </div>
                ))
              )}
            </div>

            {/* Refresh button at bottom */}
            <button 
              className="btn btn-secondary" 
              style={{ width: '100%', marginTop: '8px', display: 'flex', gap: '8px', justifyContent: 'center' }}
              onClick={handleRefresh}
            >
              <RefreshCw size={16} />
              <span>Refresh</span>
            </button>

          </div>
        </main>
      </div>
    </div>
  );
};

export default AvailableRides;
