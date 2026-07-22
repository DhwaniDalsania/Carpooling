import React, { useState } from 'react';
import { ArrowLeft, User, MoreVertical, RefreshCw, Check, Loader2, DollarSign, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Header from './Header';

export const AvailableRides = ({ routeState, onBack, onProfileClick, onNavigate }) => {
  const { token } = useAuth();
  
  // States
  const [currentHeaderTab, setCurrentHeaderTab] = useState('dashboard');
  const [isBookingId, setIsBookingId] = useState(null); // stores active booking ride ID
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
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
        throw new Error(data.message || 'Failed to confirm booking.');
      }

      setBookingSuccess('Booking confirmed! Redirecting to your active trips...');
      
      // Navigate to My Trips screen (dashboard screen, trips tab) after 1.5s
      setTimeout(() => {
        setBookingSuccess('');
        onNavigate('dashboard', { activeTab: 'trips' });
      }, 1500);

    } catch (err) {
      console.error('[bookingError]', err);
      setErrorMsg(err.message || 'We could not book the ride. Please check your balance and try again.');
    } finally {
      setIsBookingId(null);
    }
  };

  // Re-fetch / Refresh matching rides list
  const handleRefresh = async () => {
    setErrorMsg('');
    setIsLoading(true);
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
        throw new Error(data.message || 'Search request failed.');
      }

      // Refresh routeState parameters
      onNavigate('available-rides', {
        rides: data,
        searchQuery: query
      });
    } catch (err) {
      console.error('[refreshRidesError]', err);
      setErrorMsg('Unable to retrieve matching rides. Please check your connection.');
    } finally {
      setIsLoading(false);
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

  const RideSkeleton = () => (
    <div style={{
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-card)',
      padding: '24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
        <div className="shimmer-bg" style={{ width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0 }}></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <div className="shimmer-bg" style={{ width: '40%', height: '14px', borderRadius: '4px' }}></div>
          <div className="shimmer-bg" style={{ width: '70%', height: '11px', borderRadius: '4px' }}></div>
          <div className="shimmer-bg" style={{ width: '50%', height: '9px', borderRadius: '4px' }}></div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
          <div className="shimmer-bg" style={{ width: '80px', height: '10px', borderRadius: '4px' }}></div>
          <div className="shimmer-bg" style={{ width: '100px', height: '12px', borderRadius: '4px' }}></div>
        </div>
        <div className="shimmer-bg" style={{ width: '88px', height: '42px', borderRadius: '8px' }}></div>
      </div>
    </div>
  );

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
        <main className="app-content-area">
          <div className="dashboard-container" style={{ maxWidth: '820px', padding: '24px' }}>
            
            {/* Back link */}
            <button className="back-header" onClick={onBack} style={{ marginBottom: '16px' }}>
              <ArrowLeft size={16} />
              <span className="text-page-title">Available Rides</span>
            </button>

            {/* Error Message display with retry */}
            {errorMsg && (
              <div className="feedback-alert feedback-error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', marginBottom: '16px' }}>
                <span className="text-body" style={{ color: '#f87171' }}>{errorMsg}</span>
                <button className="btn-retry" onClick={handleRefresh}>
                  <RefreshCw size={12} />
                  <span>Retry</span>
                </button>
              </div>
            )}

            {/* Success Message display */}
            {bookingSuccess && (
              <div className="feedback-alert feedback-success" style={{ padding: '16px', marginBottom: '16px' }}>
                <Check size={18} />
                <span className="text-body" style={{ color: '#34d399' }}>{bookingSuccess}</span>
              </div>
            )}

            {/* Rides Listing container */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
              {isLoading ? (
                <>
                  <RideSkeleton />
                  <RideSkeleton />
                  <RideSkeleton />
                </>
              ) : matchingRides.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '32px 24px', 
                  backgroundColor: 'var(--bg-input)', 
                  border: '1px dashed var(--border-default)', 
                  borderRadius: 'var(--radius-card)',
                  color: 'var(--text-label)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px'
                }}>
                  <HelpCircle size={32} style={{ color: 'var(--text-label)' }} />
                  <div>
                    <h3 className="text-card-title" style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>No matching carpools found</h3>
                    <p className="text-meta">No drivers are currently matching your route coordinates. You can post a ride offer yourself to let others join you.</p>
                  </div>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <button 
                      className="btn btn-secondary" 
                      onClick={handleRefresh}
                      style={{ height: '36px', padding: '0 16px', fontSize: '13px' }}
                    >
                      Check again
                    </button>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => onNavigate('dashboard', { activeTab: 'dashboard', type: 'offer' })}
                      style={{ height: '36px', padding: '0 16px', fontSize: '13px' }}
                    >
                      Offer a ride
                    </button>
                  </div>
                </div>
              ) : (
                matchingRides.map((ride) => (
                  <div 
                    key={ride.id} 
                    style={{ 
                      backgroundColor: 'var(--bg-card)', 
                      border: '1px solid var(--border-default)', 
                      borderRadius: 'var(--radius-card)', 
                      padding: '24px', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      position: 'relative',
                      boxShadow: 'var(--shadow-card)',
                      gap: '16px'
                    }}
                  >
                    
                    {/* Far-right 3-dots actions menu button */}
                    <button style={{ 
                      position: 'absolute', 
                      top: '24px', 
                      right: '24px', 
                      background: 'none', 
                      border: 'none', 
                      color: 'var(--text-muted)', 
                      cursor: 'pointer' 
                    }}>
                      <MoreVertical size={18} />
                    </button>

                    {/* Driver details (left) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, overflow: 'hidden' }}>
                      <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '50%', 
                        backgroundColor: 'var(--bg-card)', 
                        border: '1px solid var(--border-default)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-secondary)',
                        overflow: 'hidden',
                        flexShrink: 0
                      }}>
                        {ride.driver?.photoUrl ? (
                          <img 
                            src={ride.driver.photoUrl} 
                            alt="" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            onError={(e) => { e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E"; }}
                          />
                        ) : (
                          <User size={24} />
                        )}
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <div className="text-card-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ride.driver?.name || 'Acme Employee'}
                        </div>
                        <div className="text-body" style={{ color: 'var(--text-label)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ride.pickupAddress} to {ride.destAddress}
                        </div>
                        {ride.vehicle && (
                          <div className="text-meta" style={{ marginTop: '4px' }}>
                            🚘 {ride.vehicle.model} ({ride.vehicle.registrationNumber})
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pricing, schedule and Book button (right) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', paddingRight: '16px', flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div className="text-meta" style={{ color: 'var(--text-label)' }}>
                          {formatRideDate(ride.datetime)}
                        </div>
                        <div className="text-body" style={{ fontWeight: '600', marginTop: '4px' }}>
                          ₹ {ride.farePerSeat} <span className="text-meta" style={{ fontWeight: '400' }}>/ seat ({ride.availableSeats} left)</span>
                        </div>
                      </div>

                      <button 
                        className="btn btn-primary" 
                        style={{ height: '42px', padding: '0 20px', fontSize: '13px', borderRadius: '8px' }}
                        onClick={() => handleBookNow(ride.id)}
                        disabled={isBookingId !== null || isLoading}
                      >
                        {isBookingId === ride.id ? (
                          <>
                            <Loader2 className="animate-spin" size={14} style={{ marginRight: '6px' }} />
                            <span>Booking...</span>
                          </>
                        ) : (
                          <span>Book this ride</span>
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
              style={{ width: '100%', marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'center' }}
              onClick={handleRefresh}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
              <span>Check for rides</span>
            </button>

          </div>
        </main>
      </div>
    </div>
  );
};

export default AvailableRides;
