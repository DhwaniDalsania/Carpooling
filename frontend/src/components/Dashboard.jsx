import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, ArrowUpDown, Clock, Users, ChevronDown, Repeat, 
  Car, Calendar, Navigation, MessageSquare, 
  Phone, MapPin, MoreVertical, Plus, Trash2, Wallet, Settings, Activity,
  ArrowLeft, Check, Loader2, ArrowRight, Play, CheckCircle2, Send, PhoneOff,
  CreditCard, Smartphone, CheckCircle, RefreshCw, Home, Briefcase, Star,
  HelpCircle, ChevronRight, BookOpen
} from 'lucide-react';

const SettingsTab = ({ onNavigate }) => {
  const menuItems = [
    { id: 'trips', label: 'My Trips', icon: Navigation, desc: 'Active, upcoming, completed & cancelled trips' },
    { id: 'vehicle', label: 'My Vehicle', icon: Car, desc: 'View, edit or register your vehicle' },
    { id: 'wallet', label: 'Payment Methods', icon: CreditCard, desc: 'Manage wallet, Razorpay recharge & linked methods' },
    { id: 'history', label: 'Ride History', icon: Clock, desc: 'Full history of your completed journeys' },
    { id: 'saved-places', label: 'Saved Places', icon: MapPin, desc: 'Manage Home, Work and custom places' },
    { id: 'help', label: 'Help', icon: HelpCircle, desc: 'Collapsible FAQs, Support Helpline & Issue Reporting' },
    { id: 'chat', label: 'Chat', icon: MessageSquare, desc: 'Real-time conversation hub for all your rides' },
  ];

  const cardStyle = {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  };

  return (
    <div className="dashboard-container" style={{ maxWidth: '800px', gap: '24px' }}>
      
      <button className="back-header" onClick={() => onNavigate('dashboard')}>
        <ArrowLeft size={16} />
        <span>Dashboard</span>
      </button>

      <div>
        <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 6px 0' }}>Settings</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 4px 0', lineHeight: '1.5' }}>
          Settings: Provides quick access to frequently used features and account preferences.
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>
          Quick Access: Navigate to My Trips, My Vehicle, Payment Methods, Ride History, Saved Places, Help, and Chat from a single location.
        </p>
      </div>

      <div style={cardStyle}>
        {menuItems.map((item, index) => {
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                background: 'transparent',
                border: 'none',
                borderBottom: index < menuItems.length - 1 ? '1px solid var(--border-color)' : 'none',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
                transition: 'background-color 0.2s',
                borderRadius: '8px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: 'rgba(15, 169, 88, 0.1)',
                color: 'var(--color-brand)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <IconComponent size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{item.label}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.desc}</div>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
            </button>
          );
        })}
      </div>

    </div>
  );
};

import { io } from 'socket.io-client';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid 
} from 'recharts';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import Header from './Header';
import Sidebar from './Sidebar';
import SavedPlaces from './SavedPlaces';
import Help from './Help';
import Chat from './Chat';

// Custom Leaflet Icons for Live Preview
const startIcon = L.divIcon ? L.divIcon({
  html: `<div style="background-color: #3b82f6; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
  className: 'custom-leaflet-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 24]
}) : null;

const destIcon = L.divIcon ? L.divIcon({
  html: `<div style="background-color: #ef4444; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
  className: 'custom-leaflet-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 24]
}) : null;

// Helper component to auto-pan and zoom map to fit markers
function MapRecenter({ pickupCoords, destCoords }) {
  const map = useMap();
  useEffect(() => {
    if (pickupCoords && destCoords) {
      map.fitBounds([
        [pickupCoords.lat, pickupCoords.lng],
        [destCoords.lat, destCoords.lng]
      ], { padding: [30, 30] });
    } else if (pickupCoords) {
      map.setView([pickupCoords.lat, pickupCoords.lng], 13);
    } else if (destCoords) {
      map.setView([destCoords.lat, destCoords.lng], 13);
    }
  }, [pickupCoords, destCoords, map]);
  return null;
}

// Simple geocoding cache to reduce redundant OS Nominatim API calls (Requirement 3)
const nominatimCache = {};

export const Dashboard = ({ onProfileClick, onNavigate, dashboardState }) => {
  const { user, token, updateProfile } = useAuth();
  
  const getSidebarLabel = () => {
    switch (currentHeaderTab) {
      case 'dashboard': return 'Dashboard';
      case 'trips': return 'My Trips';
      case 'vehicle': return 'My Vehicle';
      case 'history': return 'Ride History';
      case 'wallet': return 'Wallet & Cards';
      case 'report': return 'Reports';
      case 'setting': return 'System Settings';
      case 'saved-places': return 'Saved Places';
      case 'help': return 'Help & Support';
      case 'chat': return 'Conversations';
      default: return 'Carpooling';
    }
  };

  const getStatusBadge = (status) => {
    let text = status;
    let bgColor = 'rgba(255,255,255,0.05)';
    let color = 'var(--text-secondary)';

    if (status === 'booked') {
      text = 'Booked';
      bgColor = 'rgba(59, 130, 246, 0.15)';
      color = '#3b82f6';
    } else if (status === 'started') {
      text = 'Started';
      bgColor = 'rgba(245, 158, 11, 0.15)';
      color = '#f59e0b';
    } else if (status === 'in_progress') {
      text = 'In Progress';
      bgColor = 'rgba(16, 185, 129, 0.15)';
      color = 'var(--color-brand)';
    } else if (status === 'completed') {
      text = 'Completed';
      bgColor = 'rgba(16, 185, 129, 0.15)';
      color = 'var(--color-brand)';
    } else if (status === 'payment_pending') {
      text = 'Payment Pending';
      bgColor = 'rgba(239, 68, 68, 0.15)';
      color = '#ef4444';
    } else if (status === 'payment_completed') {
      text = 'Payment Completed';
      bgColor = 'rgba(16, 185, 129, 0.15)';
      color = 'var(--color-brand)';
    } else if (status === 'cancelled') {
      text = 'Cancelled';
      bgColor = 'rgba(239, 68, 68, 0.12)';
      color = '#ef4444';
    }

    return (
      <span style={{
        fontSize: '11px',
        fontWeight: '700',
        padding: '3px 8px',
        borderRadius: '4px',
        backgroundColor: bgColor,
        color: color
      }}>
        {text}
      </span>
    );
  };

  const formatRideDate = (datetimeStr) => {
    try {
      if (!datetimeStr) return '';
      const date = new Date(datetimeStr);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const day = date.getDate();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear().toString().substring(2);
      
      return `${hours}:${minutes} ${day}/${month}/${year}`;
    } catch {
      return datetimeStr || '';
    }
  };

  const formatOfferDateTime = (dateTimeStr) => {
    try {
      if (!dateTimeStr) return 'Not selected';
      const d = new Date(dateTimeStr);
      if (isNaN(d.getTime())) return dateTimeStr;
      return d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return dateTimeStr || 'Not selected';
    }
  };

  const formatTransactionType = (type) => {
    if (type === 'payment') return 'Ride Payment';
    if (type === 'recharge') return 'Wallet Recharge';
    return type;
  };
  
  const getInitialValue = (field, defaultValue = '') => {
    if (!dashboardState) return defaultValue;
    const query = dashboardState.searchQuery || dashboardState;
    
    if (query.type === 'find' || dashboardState.searchQuery) {
      if (field === 'pickupLoc') return query.pickupLocation || query.pickup || '';
      if (field === 'pickupCoords') {
        return query.pickupLat ? { address: query.pickupLocation || query.pickup, lat: query.pickupLat, lng: query.pickupLng } : null;
      }
      if (field === 'destLoc') return query.destination || '';
      if (field === 'destCoords') {
        return query.destLat ? { address: query.destination, lat: query.destLat, lng: query.destLng } : null;
      }
      if (field === 'rideDate') return query.date || '';
      if (field === 'rideTime') return query.time || '';
      if (field === 'numSeats') return query.seats || '1';
    }
    
    if (query.type === 'offer') {
      if (field === 'offerPickup') return query.pickupLocation || '';
      if (field === 'offerPickupCoords') {
        return query.pickupLat ? { address: query.pickupLocation, lat: query.pickupLat, lng: query.pickupLng } : null;
      }
      if (field === 'offerDest') return query.destination || '';
      if (field === 'offerDestCoords') {
        return query.destLat ? { address: query.destination, lat: query.destLat, lng: query.destLng } : null;
      }
      if (field === 'offerDateTime') return query.dateTime || '';
      if (field === 'offerSeats') return query.seats || '1';
      if (field === 'selectedVehicle') return query.vehicleId || '';
    }
    
    return defaultValue;
  };

  const getInitialTab = () => {
    if (!dashboardState) return 'find';
    const query = dashboardState.searchQuery || dashboardState;
    if (query.type === 'offer') return 'offer';
    return 'find';
  };

  // Dashboard Tabs (dashboard, trips, vehicle, history, wallet, setting, report)
  const [currentHeaderTab, setCurrentHeaderTab] = useState('dashboard');
  const [activeSearchTab, setActiveSearchTab] = useState(getInitialTab()); // 'find' or 'offer'
  
  // Trip details drill-down state
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Address search query suggestion states
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [offerPickupSuggestions, setOfferPickupSuggestions] = useState([]);
  const [offerDestSuggestions, setOfferDestSuggestions] = useState([]);

  // Saved places state
  const [savedPlaces, setSavedPlaces] = useState([]);
  const savedPlacesRef = useRef([]);

  // Resolved coordinate selection states (Requirement 2)
  const [pickupCoords, setPickupCoords] = useState(getInitialValue('pickupCoords', null));
  const [destCoords, setDestCoords] = useState(getInitialValue('destCoords', null));
  const [offerPickupCoords, setOfferPickupCoords] = useState(getInitialValue('offerPickupCoords', null));
  const [offerDestCoords, setOfferDestCoords] = useState(getInitialValue('offerDestCoords', null));

  // Input textbox states
  const [pickupLoc, setPickupLoc] = useState(getInitialValue('pickupLoc', ''));
  const [destLoc, setDestLoc] = useState(getInitialValue('destLoc', ''));
  const [rideDate, setRideDate] = useState(getInitialValue('rideDate', ''));
  const [rideTime, setRideTime] = useState(getInitialValue('rideTime', ''));
  const [numSeats, setNumSeats] = useState(getInitialValue('numSeats', '1'));

  // Offer a Ride Form States
  const [offerPickup, setOfferPickup] = useState(getInitialValue('offerPickup', ''));
  const [offerDest, setOfferDest] = useState(getInitialValue('offerDest', ''));
  const [offerDateTime, setOfferDateTime] = useState(getInitialValue('offerDateTime', ''));
  const [offerSeats, setOfferSeats] = useState(getInitialValue('offerSeats', '1'));
  const [selectedVehicle, setSelectedVehicle] = useState(getInitialValue('selectedVehicle', ''));

  // Dynamic lists from backend
  const [userVehicles, setUserVehicles] = useState([]);
  const [activeTrips, setActiveTrips] = useState([]);
  const [historyTrips, setHistoryTrips] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Wallet Tab States
  const [walletBalance, setWalletBalance] = useState(500);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [rechargeAmt, setRechargeAmt] = useState('500');

  // Payment Screen States (Screen 14)
  const [activePaymentMode, setActivePaymentMode] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('wallet'); 
  const [razorpayOrder, setRazorpayOrder] = useState(null);
  const [cardNum, setCardNum] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [upiId, setUpiId] = useState('');
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);

  // Reports Summary State (Screen 17)
  const [reportSummary, setReportSummary] = useState(null);

  // Chat Panel states
  const [chatMessages, setChatMessages] = useState([]);
  const [typedMessage, setTypedMessage] = useState('');
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);

  const [phoneNum, setPhoneNum] = useState('');

  // Prefill phone input from user context once loaded
  useEffect(() => {
    if (user?.phone) {
      setPhoneNum(user.phone);
    }
  }, [user]);

  // Add Vehicle Form States
  const [newModel, setNewModel] = useState('');
  const [newReg, setNewReg] = useState('');
  const [newCapacity, setNewCapacity] = useState('4');
  const [newActive, setNewActive] = useState(true);
  const [vehicleSuccess, setVehicleSuccess] = useState('');
  const [vehicleError, setVehicleError] = useState(''); // Dedicated error state (Requirement 7)
  const [editingVehicleId, setEditingVehicleId] = useState(null);

  // Debounce timers reference
  const debounceTimersRef = useRef({});

  // Sync tab with external navigation state updates
  useEffect(() => {
    if (dashboardState?.activeTab) {
      setCurrentHeaderTab(dashboardState.activeTab);
    }
  }, [dashboardState]);

  const handleTabChange = (tabId) => {
    setCurrentHeaderTab(tabId);
    setSelectedTrip(null);
    setActivePaymentMode(null);
  };

  // ── Address Autocomplete Suggestions Query (Nominatim) ─────────────────────
  
  const fetchSuggestions = async (query, setSuggestions) => {
    const trimmed = query.trim().toLowerCase();
    
    let localMatches = [];
    if (savedPlacesRef.current && savedPlacesRef.current.length > 0) {
      if (trimmed.length === 0) {
        localMatches = savedPlacesRef.current;
      } else {
        localMatches = savedPlacesRef.current.filter(p => 
          p.label.toLowerCase().includes(trimmed) || 
          p.address.toLowerCase().includes(trimmed)
        );
      }
    }

    const formattedLocal = localMatches.map(p => ({
      address: p.address,
      label: p.label,
      lat: p.lat,
      lng: p.lng
    }));

    if (trimmed.length < 3) {
      setSuggestions(formattedLocal);
      return;
    }

    if (nominatimCache[trimmed]) {
      setSuggestions([...formattedLocal, ...nominatimCache[trimmed]]);
      return;
    }

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(trimmed)}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'EnterpriseCarpoolingHackathon/1.0 (dhwanidalsania@example.com)'
        }
      });
      if (res.ok) {
        const data = await res.json();
        const results = data.map(item => ({
          address: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon)
        }));
        nominatimCache[trimmed] = results;
        setSuggestions([...formattedLocal, ...results]);
      }
    } catch (err) {
      console.error('[Nominatim Error]', err);
    }
  };

  const handleLocationInputChange = (value, inputName, setInputVal, setSuggestions) => {
    setInputVal(value);
    
    // Clear existing timer
    if (debounceTimersRef.current[inputName]) {
      clearTimeout(debounceTimersRef.current[inputName]);
    }

    // Debounce search requests by 300ms (Requirement 2)
    debounceTimersRef.current[inputName] = setTimeout(() => {
      fetchSuggestions(value, setSuggestions);
    }, 300);
  };

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
    setIsLoadingData(true);
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
    } finally {
      setIsLoadingData(false);
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

  const fetchWalletData = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/wallet/balance', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWalletBalance(data.balance);
        setWalletTransactions(data.transactions);
      }
    } catch (err) {
      console.error('Failed to fetch wallet info', err);
    }
  };

  const fetchReportSummary = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/reports/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReportSummary(data);
      }
    } catch (err) {
      console.error('Failed to fetch report summary', err);
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

  const fetchSavedPlaces = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/saved-places', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSavedPlaces(data);
        savedPlacesRef.current = data;
      }
    } catch (err) {
      console.error('Failed to fetch saved places', err);
    }
  };

  // Load data dynamically based on active tab switching
  useEffect(() => {
    if (!token) return;

    fetchVehicles();
    fetchTrips();
    fetchSavedPlaces();

    if (currentHeaderTab === 'history') {
      fetchHistory();
    } else if (currentHeaderTab === 'wallet') {
      fetchWalletData();
    } else if (currentHeaderTab === 'report') {
      fetchReportSummary();
    }
  }, [token, currentHeaderTab]);

  // Polling loop: Only refresh active trips every 10 seconds to keep UI responsive without DB locks
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      fetchTrips();
    }, 10000);

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

    fetchChatHistory(selectedTrip.id);

    const socket = io('/chat');
    socketRef.current = socket;

    socket.emit('join:trip', selectedTrip.id);

    const handleIncomingMsg = (msg) => {
      setChatMessages((prev) => {
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

  // Auto-scroll chat history
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Swap Locations function (updates both textual display and coordinate parameters)
  const handleSwapLocations = () => {
    if (activeSearchTab === 'find') {
      const tempLoc = pickupLoc;
      const tempCoords = pickupCoords;
      setPickupLoc(destLoc);
      setPickupCoords(destCoords);
      setDestLoc(tempLoc);
      setDestCoords(tempCoords);
    } else {
      const tempLoc = offerPickup;
      const tempCoords = offerPickupCoords;
      setOfferPickup(offerDest);
      setOfferPickupCoords(offerDestCoords);
      setOfferDest(tempLoc);
      setOfferDestCoords(tempCoords);
    }
  };

  // Submit Find Ride (requires explicit selected Nominatim suggestions & phone validation)
  const resolveAddressCoords = async (address) => {
    if (!address.trim()) return null;
    try {
      const trimmed = address.trim();
      if (nominatimCache[trimmed] && nominatimCache[trimmed].length > 0) {
        return nominatimCache[trimmed][0];
      }

      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(trimmed)}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'EnterpriseCarpoolingHackathon/1.0 (dhwanidalsania@example.com)'
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          return {
            address: data[0].display_name,
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
          };
        }
      }
    } catch (err) {
      console.error('Nominatim resolution error:', err);
    }
    return null;
  };

  // Submit Find Ride (requires explicit selected Nominatim suggestions & phone verification)
  const handleFindSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!pickupLoc.trim() || !destLoc.trim() || !rideDate || !rideTime || !numSeats || !phoneNum.trim()) {
      alert('All fields are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      let resolvedPickup = pickupCoords;
      if (!resolvedPickup || resolvedPickup.address.trim() !== pickupLoc.trim()) {
        resolvedPickup = await resolveAddressCoords(pickupLoc);
        if (!resolvedPickup) {
          alert('Could not resolve pickup location. Please select a valid location from the suggestions.');
          setIsSubmitting(false);
          return;
        }
        setPickupCoords(resolvedPickup);
        setPickupLoc(resolvedPickup.address);
      }

      let resolvedDest = destCoords;
      if (!resolvedDest || resolvedDest.address.trim() !== destLoc.trim()) {
        resolvedDest = await resolveAddressCoords(destLoc);
        if (!resolvedDest) {
          alert('Could not resolve destination location. Please select a valid location from the suggestions.');
          setIsSubmitting(false);
          return;
        }
        setDestCoords(resolvedDest);
        setDestLoc(resolvedDest.address);
      }
      
      // Auto-update profile in database if changed
      if (phoneNum.trim() !== user?.phone) {
        try {
          await updateProfile(user.name, user.photoUrl, phoneNum.trim());
        } catch (err) {
          console.error('Failed to auto-update profile phone number:', err);
        }
      }

      onNavigate('route-confirmation', {
        type: 'find',
        pickupLocation: resolvedPickup.address,
        pickupLat: resolvedPickup.lat,
        pickupLng: resolvedPickup.lng,
        destination: resolvedDest.address,
        destLat: resolvedDest.lat,
        destLng: resolvedDest.lng,
        date: rideDate,
        time: rideTime,
        seats: numSeats
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Offer Ride (requires explicit selected Nominatim suggestions & phone verification)
  const handleOfferSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    if (userVehicles.length === 0) {
      alert('You must register a vehicle first before offering a ride.');
      setCurrentHeaderTab('vehicle');
      return;
    }

    if (!offerPickup.trim() || !offerDest.trim() || !offerDateTime || !offerSeats || !selectedVehicle || !phoneNum.trim()) {
      alert('All fields are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      let resolvedPickup = offerPickupCoords;
      if (!resolvedPickup || resolvedPickup.address.trim() !== offerPickup.trim()) {
        resolvedPickup = await resolveAddressCoords(offerPickup);
        if (!resolvedPickup) {
          alert('Could not resolve pickup location. Please select a valid location from the suggestions.');
          setIsSubmitting(false);
          return;
        }
        setOfferPickupCoords(resolvedPickup);
        setOfferPickup(resolvedPickup.address);
      }

      let resolvedDest = offerDestCoords;
      if (!resolvedDest || resolvedDest.address.trim() !== offerDest.trim()) {
        resolvedDest = await resolveAddressCoords(offerDest);
        if (!resolvedDest) {
          alert('Could not resolve destination location. Please select a valid location from the suggestions.');
          setIsSubmitting(false);
          return;
        }
        setOfferDestCoords(resolvedDest);
        setOfferDest(resolvedDest.address);
      }

      // Auto-update profile in database if changed
      if (phoneNum.trim() !== user?.phone) {
        try {
          await updateProfile(user.name, user.photoUrl, phoneNum.trim());
        } catch (err) {
          console.error('Failed to auto-update profile phone number:', err);
        }
      }

      const selectedCar = userVehicles.find(v => v.id === selectedVehicle);
      onNavigate('route-confirmation', {
        type: 'offer',
        pickupLocation: resolvedPickup.address,
        pickupLat: resolvedPickup.lat,
        pickupLng: resolvedPickup.lng,
        destination: resolvedDest.address,
        destLat: resolvedDest.lat,
        destLng: resolvedDest.lng,
        dateTime: offerDateTime,
        seats: offerSeats,
        vehicleId: selectedVehicle,
        vehicle: selectedCar ? `${selectedCar.model} (${selectedCar.registrationNumber})` : 'Registered Vehicle'
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add/Edit Vehicle Submit (upper-cased registration code checks)
  const handleAddVehicle = async (e) => {
    e.preventDefault();
    setVehicleSuccess('');
    setVehicleError('');

    if (!newModel.trim() || !newReg.trim() || !newCapacity) {
      setVehicleError('All fields are required.');
      return;
    }

    const normalizedReg = newReg.trim().toUpperCase();

    try {
      let res;
      if (editingVehicleId) {
        res = await fetch(`/api/vehicles/${editingVehicleId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            model: newModel.trim(),
            registrationNumber: normalizedReg,
            seatingCapacity: parseInt(newCapacity, 10),
            status: newActive ? 'active' : 'inactive'
          })
        });
      } else {
        res = await fetch('/api/vehicles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            model: newModel,
            registrationNumber: normalizedReg,
            seatingCapacity: parseInt(newCapacity, 10),
            status: newActive ? 'active' : 'inactive'
          })
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to save vehicle details.');
      }

      setVehicleSuccess(editingVehicleId ? 'Vehicle updated successfully!' : 'Vehicle registered successfully!');
      setNewModel('');
      setNewReg('');
      setNewCapacity('4');
      setNewActive(true);
      setEditingVehicleId(null);
      
      await fetchVehicles();
    } catch (err) {
      setVehicleError(err.message);
    }
  };

  // Toggle vehicle status locally and in the database
  const handleToggleVehicleStatus = async (vehicle) => {
    const nextStatus = vehicle.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`/api/vehicles/${vehicle.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          model: vehicle.model,
          registrationNumber: vehicle.registrationNumber,
          seatingCapacity: vehicle.seatingCapacity,
          status: nextStatus
        })
      });
      if (res.ok) {
        await fetchVehicles();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to update vehicle status.');
      }
    } catch (err) {
      console.error('Failed to toggle vehicle status', err);
    }
  };

  const startEditVehicle = (vehicle) => {
    setEditingVehicleId(vehicle.id);
    setNewModel(vehicle.model);
    setNewReg(vehicle.registrationNumber);
    setNewCapacity(vehicle.seatingCapacity.toString());
    setNewActive(vehicle.status === 'active');
    setVehicleSuccess('');
    setVehicleError('');
  };

  const cancelEditVehicle = () => {
    setEditingVehicleId(null);
    setNewModel('');
    setNewReg('');
    setNewCapacity('4');
    setNewActive(true);
    setVehicleSuccess('');
    setVehicleError('');
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

  // ── Trip Cancellation — Passenger only ────────────────────────────────────
  const handleCancelBooking = async (trip, e) => {
    e.stopPropagation();
    const confirm = window.confirm(
      `Cancel your booking for this trip?\n\nCancellation rules:\n• Only allowed if trip has not started\n• Must be more than 1 hour before departure\n• Any wallet payment will be refunded automatically`
    );
    if (!confirm) return;

    setIsLoadingData(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}/cancel`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Cancellation failed.');
      alert(data.message || 'Booking cancelled successfully.');
      await fetchTrips();
    } catch (err) {
      alert(err.message || 'Failed to cancel booking.');
    } finally {
      setIsLoadingData(false);
    }
  };

  // ── Wallet and Payment Operations ──────────────────────────────────────────

  const handleStartPaymentFlow = (trip) => {
    setSelectedTrip(trip);
    setActivePaymentMode('select');
    setPaymentMethod('wallet');
  };

  const handleProceedPayment = async () => {
    if (!selectedTrip) return;
    console.info('[payment] Pay button clicked', { tripId: selectedTrip.id, method: paymentMethod });

    if (paymentMethod === 'wallet') {
      if (walletBalance < selectedTrip.fare) {
        alert('Insufficient wallet balance. Please recharge your wallet.');
        return;
      }
      setIsLoadingData(true);
      try {
        const res = await fetch('/api/wallet/pay', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ tripId: selectedTrip.id })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Payment failed.');

        setPaymentSuccessData({
          method: 'Carpool Wallet',
          amount: selectedTrip.fare,
          orderId: 'WLT_' + Math.random().toString(36).substring(5).toUpperCase()
        });
        setActivePaymentMode('success');
        await fetchWalletData();
        await fetchTrips();
      } catch (err) {
        alert(err.message);
      } finally {
        setIsLoadingData(false);
      }
    } else {
      setIsLoadingData(true);
      try {
        // 1. Verify window.Razorpay is defined before opening checkout (Requirement 1)
        if (typeof window.Razorpay !== 'function') {
          throw new Error('Razorpay Checkout SDK did not load. Disable content blockers and refresh the page.');
        }

        console.info('[payment] Calling create-order API', { tripId: selectedTrip.id });
        const res = await fetch('/api/payments/create-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ tripId: selectedTrip.id })
        });
        const data = await res.json();
        
        // Handle failed order creation
        if (!res.ok) {
          throw new Error(data.message || 'Failed to create payment order.');
        }

        console.info('[payment] Order response received', { status: res.status, order_id: data.order_id, amount: data.amount, currency: data.currency });
        
        // 2. Validate order response properties individually to throw meaningful error messages (Requirement 8)
        if (!data.key_id) {
          throw new Error('Razorpay Key ID is missing from the server response.');
        }
        if (!data.order_id) {
          throw new Error('Razorpay Order ID is missing from the server response.');
        }
        if (!data.amount || !data.currency) {
          throw new Error('Razorpay order amount or currency is missing from the server response.');
        }

        if (data.isMock) {
          console.info('[payment] Razorpay returned a mock order. Redirecting to Simulated Sandbox.');
          setRazorpayOrder({
            orderId: data.order_id,
            amount: data.amount,
            currency: data.currency
          });
          setActivePaymentMode('gateway');
        } else {
          const options = {
            key: data.key_id,
            amount: data.amount,
            currency: data.currency,
            name: 'Carpooling Platform',
            description: `Payment for Ride #${selectedTrip.id}`,
            order_id: data.order_id,
            handler: async function (response) {
              try {
                console.info('[payment] Razorpay payment success received', { paymentId: response.razorpay_payment_id });
                console.info('[payment] Calling payment verification API');
                const verifyRes = await fetch('/api/payments/verify', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    tripId: selectedTrip.id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    method: paymentMethod
                  })
                });
                const verifyData = await verifyRes.json();
                if (!verifyRes.ok) throw new Error(verifyData.message || 'Signature mismatch');
                console.info('[payment] Payment verification succeeded');

                setPaymentSuccessData({
                  method: paymentMethod === 'card' ? 'Razorpay Card' : 'Razorpay UPI',
                  amount: selectedTrip.fare,
                  orderId: response.razorpay_payment_id
                });
                setActivePaymentMode('success');
                await fetchTrips();
              } catch (err) {
                alert(err.message);
                console.error('[payment] Payment verification failed', err);
              }
            },
            modal: {
              ondismiss: function () {
                console.warn('[payment] Razorpay Checkout payment cancelled by user');
                alert('Payment cancelled by user.');
              }
            },
            prefill: {
              name: user?.name,
              email: user?.email
            },
            theme: {
              color: '#0fa958'
            }
          };
          console.info('[payment] Razorpay initialized', { order_id: data.order_id });
          const rzp = new window.Razorpay(options);
          rzp.on('payment.failed', (response) => {
            console.error('[payment] Razorpay payment failed', response.error);
            alert(response.error?.description || 'Razorpay payment failed. Please try again.');
          });
          console.info('[payment] Opening Razorpay Checkout');
          rzp.open();
        }
      } catch (err) {
        alert(err.message);
        console.error('[payment] Checkout failed to open', err);
      } finally {
        setIsLoadingData(false);
      }
    }
  };

  const handleSimulatedPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!razorpayOrder) return;

    if (paymentMethod === 'card' && (!cardNum || !cardExpiry || !cardCvv)) {
      alert('Please fill out all card details');
      return;
    }
    if (paymentMethod === 'upi' && !upiId.trim()) {
      alert('Please enter your UPI ID');
      return;
    }

    setIsLoadingData(true);
    try {
      const mockPayId = 'pay_mock_' + Math.random().toString(36).substring(7);
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tripId: selectedTrip.id,
          razorpay_order_id: razorpayOrder.orderId,
          razorpay_payment_id: mockPayId,
          razorpay_signature: 'sig_mock_signature',
          method: paymentMethod
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to verify payment');

      setPaymentSuccessData({
        method: paymentMethod === 'card' ? 'Card (Simulated)' : 'UPI (Simulated)',
        amount: selectedTrip.fare,
        orderId: mockPayId
      });
      setActivePaymentMode('success');
      setCardNum('');
      setCardExpiry('');
      setCardCvv('');
      setUpiId('');
      setRazorpayOrder(null);
      await fetchTrips();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleRechargeSubmit = async (e) => {
    e.preventDefault();
    const amountVal = parseFloat(rechargeAmt);
    if (isNaN(amountVal) || amountVal <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    // Verify Razorpay SDK is available upfront
    if (typeof window.Razorpay !== 'function') {
      alert('Razorpay Checkout SDK did not load. Disable content blockers and refresh the page.');
      return;
    }

    setIsLoadingData(true);
    try {
      console.info('[recharge] Creating Razorpay order for wallet top-up', { amount: amountVal });

      const res = await fetch('/api/wallet/recharge-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: amountVal })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create recharge order.');

      console.info('[recharge] Razorpay order created', { order_id: data.order_id, amount: data.amount });

      if (!data.key_id) throw new Error('Razorpay Key ID is missing from the server response.');
      if (!data.order_id) throw new Error('Razorpay Order ID is missing from the server response.');

      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency || 'INR',
        name: 'Carpooling Platform',
        description: `Wallet Recharge — ₹${amountVal}`,
        order_id: data.order_id,
        handler: async function (response) {
          try {
            console.info('[recharge] Razorpay payment success', { paymentId: response.razorpay_payment_id });
            const verifyRes = await fetch('/api/wallet/recharge-verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount: amountVal
              })
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.message || 'Payment verification failed.');
            console.info('[recharge] Wallet credited successfully');
            alert(`✅ Successfully added ₹${amountVal} to your wallet!`);
            setRechargeAmt('500');
            await fetchWalletData();
          } catch (err) {
            alert(err.message);
            console.error('[recharge] Recharge verify failed', err);
          }
        },
        modal: {
          ondismiss: function () {
            console.warn('[recharge] Razorpay recharge cancelled by user');
            alert('Wallet recharge cancelled.');
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email
        },
        theme: {
          color: '#0fa958'
        }
      };

      console.info('[recharge] Opening Razorpay Checkout for wallet recharge');
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        console.error('[recharge] Razorpay payment failed', response.error);
        alert(response.error?.description || 'Razorpay recharge payment failed. Please try again.');
      });
      rzp.open();
    } catch (err) {
      alert(err.message);
      console.error('[recharge] Checkout failed', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!typedMessage.trim() || !socketRef.current || !selectedTrip) return;

    socketRef.current.emit('message:send', {
      tripId: selectedTrip.id,
      senderId: user.id,
      text: typedMessage.trim()
    }, (result) => {
      if (!result?.ok) {
        console.error(result?.error || 'Failed to send message.');
        return;
      }
      setChatMessages((prev) => {
        if (prev.some((message) => message.id === result.message.id)) return prev;
        return [...prev, result.message];
      });
    });

    setTypedMessage('');
  };

  const focusChatInput = () => {
    if (chatInputRef.current) {
      chatInputRef.current.focus();
      chatInputRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Reusable Premium Loading Skeletons (Requirement 3)
  const SkeletonCard = () => (
    <div style={{
      height: '92px',
      backgroundColor: 'var(--bg-input)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      opacity: 0.5,
      animation: 'pulse 1.8s infinite'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.06)' }}></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ width: '130px', height: '12px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '4px' }}></div>
          <div style={{ width: '190px', height: '9px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '4px' }}></div>
        </div>
      </div>
      <div style={{ width: '50px', height: '16px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '4px' }}></div>
    </div>
  );

  // Suggestions Dropdown Styling
  const suggestionsDropdownStyle = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    boxShadow: '0 8px 16px rgba(0,0,0,0.25)',
    margin: '4px 0 0 0',
    padding: '6px 0',
    listStyle: 'none',
    maxHeight: '200px',
    overflowY: 'auto'
  };

  const suggestionItemStyle = {
    padding: '8px 12px',
    fontSize: '12px',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    textAlign: 'left'
  };

  const isFind = activeSearchTab === 'find';
  const pickupLocVal = isFind ? pickupLoc : offerPickup;
  const pickupCoordsVal = isFind ? pickupCoords : offerPickupCoords;
  const destLocVal = isFind ? destLoc : offerDest;
  const destCoordsVal = isFind ? destCoords : offerDestCoords;

  return (
    <div className="app-container animate-fade-in">
      {/* Header Bar */}
      <Header
        onProfileClick={onProfileClick}
        currentTab={currentHeaderTab}
        setCurrentTab={handleTabChange}
        showTabs={true}
      />

      {/* Main layout */}
      <div className="app-body-wrapper">
        <Sidebar label={getSidebarLabel()} />

        <main className="app-content-area">
          <div className="app-content-container">
          
          {/* Sub-view: DASHBOARD SEARCH/OFFER FORMS */}
          {currentHeaderTab === 'dashboard' && (
            <div className="ride-planner-card">
              {/* 1. Card Header Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border-default)', paddingBottom: '20px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(20, 184, 166, 0.1)',
                  color: 'var(--accent-teal)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Car size={22} />
                </div>
                <div>
                  <h2 className="text-card-title" style={{ fontSize: '18px', margin: 0 }}>Plan your ride</h2>
                  <p className="text-meta" style={{ color: 'var(--text-label)', margin: '2px 0 0 0' }}>Search for available rides or offer your own</p>
                </div>
              </div>

              {/* 3. Redesigned Tab Toggles (Height 44px Buttons, inline icons) */}
              <div className="dashboard-toggle-tabs large-track">
                <button
                  type="button"
                  className={`tab-toggle-btn ${activeSearchTab === 'find' ? 'active' : ''}`}
                  onClick={() => setActiveSearchTab('find')}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', zIndex: 1, border: 'none', background: 'transparent' }}
                >
                  <Search size={16} />
                  <span>Find a Ride</span>
                </button>
                <button
                  type="button"
                  className={`tab-toggle-btn ${activeSearchTab === 'offer' ? 'active' : ''}`}
                  onClick={() => setActiveSearchTab('offer')}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', zIndex: 1, border: 'none', background: 'transparent' }}
                >
                  <Car size={16} />
                  <span>Offer a Ride</span>
                </button>
              </div>

              {/* 5. Two-column grid (Form column 65% / Summary rail 35%) */}
              <div className="ride-planner-grid">
                
                {/* Form Column */}
                <div>
                  {activeSearchTab === 'find' && (
                    <form onSubmit={handleFindSubmit} className="auth-form" style={{ gap: '24px' }}>
                      {/* Zone A: Route Zone (recessed background panel) */}
                      <div className="planner-zone-panel">
                        <h4 className="text-meta" style={{ color: 'var(--accent-teal)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700', margin: 0 }}>
                          Route Details
                        </h4>
                        
                        <div className="locations-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                          {/* Pickup */}
                          <div className="form-group" style={{ position: 'relative', width: '100%' }}>
                            <label className="form-label">Pickup Location</label>
                            <div className="input-icon-wrapper">
                              <div className="input-icon-left">
                                <Search size={18} />
                              </div>
                              <input
                                type="text"
                                className="input-field text-body"
                                placeholder="Search pickup location..."
                                value={pickupLoc}
                                onChange={(e) => handleLocationInputChange(e.target.value, 'find_pickup', setPickupLoc, setPickupSuggestions)}
                                onFocus={(e) => fetchSuggestions(e.target.value, setPickupSuggestions)}
                                required
                              />
                            </div>
                            {pickupSuggestions.length > 0 && (
                              <ul style={suggestionsDropdownStyle}>
                                {pickupSuggestions.map((suggestion, idx) => (
                                  <li 
                                    key={idx} 
                                    style={suggestionItemStyle}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                    onClick={() => {
                                      setPickupLoc(suggestion.address);
                                      setPickupCoords(suggestion);
                                      setPickupSuggestions([]);
                                    }}
                                  >
                                    {suggestion.label ? `⭐ ${suggestion.label} - ${suggestion.address}` : suggestion.address}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          {/* Swap */}
                          <div className="swap-btn-container" style={{ alignSelf: 'center', paddingTop: 0, margin: '-4px 0' }}>
                            <button
                              type="button"
                              className="swap-btn"
                              onClick={handleSwapLocations}
                              title="Swap locations"
                            >
                              <ArrowUpDown size={18} />
                            </button>
                          </div>

                          {/* Destination */}
                          <div className="form-group" style={{ position: 'relative', width: '100%' }}>
                            <label className="form-label">Destination Location</label>
                            <div className="input-icon-wrapper">
                              <div className="input-icon-left">
                                <Search size={18} />
                              </div>
                              <input
                                type="text"
                                className="input-field text-body"
                                placeholder="Search destination location..."
                                value={destLoc}
                                onChange={(e) => handleLocationInputChange(e.target.value, 'find_dest', setDestLoc, setDestSuggestions)}
                                onFocus={(e) => fetchSuggestions(e.target.value, setDestSuggestions)}
                                required
                              />
                            </div>
                            {destSuggestions.length > 0 && (
                              <ul style={suggestionsDropdownStyle}>
                                {destSuggestions.map((suggestion, idx) => (
                                  <li 
                                    key={idx} 
                                    style={suggestionItemStyle}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                    onClick={() => {
                                      setDestLoc(suggestion.address);
                                      setDestCoords(suggestion);
                                      setDestSuggestions([]);
                                    }}
                                  >
                                    {suggestion.label ? `⭐ ${suggestion.label} - ${suggestion.address}` : suggestion.address}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Zone B: Details Zone */}
                      <div className="planner-zone-panel">
                        <h4 className="text-meta" style={{ color: 'var(--accent-teal)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700', margin: 0 }}>
                          Commute Options
                        </h4>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div className="form-row-2col">
                            <div className="form-group">
                              <label className="form-label">Date</label>
                              <div className="input-icon-wrapper">
                                <div className="input-icon-left">
                                  <Calendar size={18} />
                                </div>
                                <input
                                  type="date"
                                  className="input-field text-body"
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
                                  className="input-field text-body"
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
                                className="input-field seat-select text-body"
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
                            <label className="form-label">Phone Number</label>
                            <div className="input-icon-wrapper">
                              <div className="input-icon-left">
                                <Phone size={18} style={{ transform: 'rotate(90deg)' }} />
                              </div>
                              <input
                                type="tel"
                                className="input-field text-body"
                                placeholder="Enter your phone number..."
                                value={phoneNum}
                                onChange={(e) => setPhoneNum(e.target.value)}
                                required
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Submit Section (separated with divider + description) */}
                      <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '48px', fontSize: '15px', fontWeight: '700' }} disabled={isSubmitting}>
                          {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Navigation size={18} />}
                          <span>Search Available Rides</span>
                        </button>
                        <span className="text-meta" style={{ color: 'var(--text-label)', textAlign: 'center' }}>
                          You'll see available rides after this
                        </span>
                      </div>
                    </form>
                  )}

                  {activeSearchTab === 'offer' && (
                    <form onSubmit={handleOfferSubmit} className="auth-form" style={{ gap: '24px' }}>
                      {/* Zone A: Route Zone (recessed background panel) */}
                      <div className="planner-zone-panel">
                        <h4 className="text-meta" style={{ color: 'var(--accent-teal)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700', margin: 0 }}>
                          Route Details
                        </h4>
                        
                        <div className="locations-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                          {/* Pickup */}
                          <div className="form-group" style={{ position: 'relative', width: '100%' }}>
                            <label className="form-label">Pickup Location</label>
                            <div className="input-icon-wrapper">
                              <div className="input-icon-left">
                                <Search size={18} />
                              </div>
                              <input
                                type="text"
                                className="input-field text-body"
                                placeholder="Search pickup location..."
                                value={offerPickup}
                                onChange={(e) => handleLocationInputChange(e.target.value, 'offer_pickup', setOfferPickup, setOfferPickupSuggestions)}
                                onFocus={(e) => fetchSuggestions(e.target.value, setOfferPickupSuggestions)}
                                required
                              />
                            </div>
                            {offerPickupSuggestions.length > 0 && (
                              <ul style={suggestionsDropdownStyle}>
                                {offerPickupSuggestions.map((suggestion, idx) => (
                                  <li 
                                    key={idx} 
                                    style={suggestionItemStyle}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                    onClick={() => {
                                      setOfferPickup(suggestion.address);
                                      setOfferPickupCoords(suggestion);
                                      setOfferPickupSuggestions([]);
                                    }}
                                  >
                                    {suggestion.label ? `⭐ ${suggestion.label} - ${suggestion.address}` : suggestion.address}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          {/* Swap */}
                          <div className="swap-btn-container" style={{ alignSelf: 'center', paddingTop: 0, margin: '-4px 0' }}>
                            <button
                              type="button"
                              className="swap-btn"
                              onClick={handleSwapLocations}
                              title="Swap locations"
                            >
                              <ArrowUpDown size={18} />
                            </button>
                          </div>

                          {/* Destination */}
                          <div className="form-group" style={{ position: 'relative', width: '100%' }}>
                            <label className="form-label">Destination Location</label>
                            <div className="input-icon-wrapper">
                              <div className="input-icon-left">
                                <Search size={18} />
                              </div>
                              <input
                                type="text"
                                className="input-field text-body"
                                placeholder="Search destination location..."
                                value={offerDest}
                                onChange={(e) => handleLocationInputChange(e.target.value, 'offer_dest', setOfferDest, setOfferDestSuggestions)}
                                onFocus={(e) => fetchSuggestions(e.target.value, setOfferDestSuggestions)}
                                required
                              />
                            </div>
                            {offerDestSuggestions.length > 0 && (
                              <ul style={suggestionsDropdownStyle}>
                                {offerDestSuggestions.map((suggestion, idx) => (
                                  <li 
                                    key={idx} 
                                    style={suggestionItemStyle}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                    onClick={() => {
                                      setOfferDest(suggestion.address);
                                      setOfferDestCoords(suggestion);
                                      setOfferDestSuggestions([]);
                                    }}
                                  >
                                    {suggestion.label ? `⭐ ${suggestion.label} - ${suggestion.address}` : suggestion.address}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Zone B: Details Zone */}
                      <div className="planner-zone-panel">
                        <h4 className="text-meta" style={{ color: 'var(--accent-teal)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700', margin: 0 }}>
                          Commute Options
                        </h4>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div className="form-row-2col">
                            <div className="form-group">
                              <label className="form-label">Departure Date & Time</label>
                              <div className="input-icon-wrapper">
                                <div className="input-icon-left">
                                  <Clock size={18} />
                                </div>
                                <input
                                  type="datetime-local"
                                  className="input-field text-body"
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
                                  className="input-field seat-select text-body"
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

                          <div className="form-group">
                            <label className="form-label">Vehicle</label>
                            <div className="input-icon-wrapper seat-select-wrapper">
                              <div className="input-icon-left">
                                <Car size={18} />
                              </div>
                              <select
                                className="input-field seat-select text-body"
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

                          <div className="form-group">
                            <label className="form-label">Phone Number</label>
                            <div className="input-icon-wrapper">
                              <div className="input-icon-left">
                                <Phone size={18} style={{ transform: 'rotate(90deg)' }} />
                              </div>
                              <input
                                type="tel"
                                className="input-field text-body"
                                placeholder="Enter your phone number..."
                                value={phoneNum}
                                onChange={(e) => setPhoneNum(e.target.value)}
                                required
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Submit Section (separated with divider + description) */}
                      <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '48px', fontSize: '15px', fontWeight: '700' }} disabled={isSubmitting}>
                          {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Car size={18} />}
                          <span>Publish Ride Offer</span>
                        </button>
                        <span className="text-meta" style={{ color: 'var(--text-label)', textAlign: 'center' }}>
                          Your ride will be visible to nearby riders
                        </span>
                      </div>
                    </form>
                  )}
                </div>

                {/* Right-side Preview Rail (Only rendered layout logic) */}
                <div className="ride-summary-rail-wrapper">
                  <div className="ride-summary-rail">
                    <h3 className="text-card-title" style={{ fontSize: '15px', margin: 0 }}>Live Commute Preview</h3>
                    
                    {/* Live Route Points Line */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', paddingLeft: '20px', borderLeft: '2px dashed var(--border-default)' }}>
                      {/* Pickup dot */}
                      <div style={{ position: 'absolute', left: '-6px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--accent-teal)' }} />
                      <div>
                        <div className="text-meta" style={{ fontSize: '11px', color: 'var(--text-label)' }}>PICKUP FROM</div>
                        <div className="text-body" style={{ fontWeight: '600', marginTop: '2px', wordBreak: 'break-word' }}>
                          {activeSearchTab === 'find' ? (pickupLoc || 'Choose pickup...') : (offerPickup || 'Choose pickup...')}
                        </div>
                      </div>

                      {/* Destination dot */}
                      <div style={{ position: 'absolute', left: '-6px', bottom: '4px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                      <div>
                        <div className="text-meta" style={{ fontSize: '11px', color: 'var(--text-label)' }}>DESTINATION</div>
                        <div className="text-body" style={{ fontWeight: '600', marginTop: '2px', wordBreak: 'break-word' }}>
                          {activeSearchTab === 'find' ? (destLoc || 'Choose destination...') : (offerDest || 'Choose destination...')}
                        </div>
                      </div>
                    </div>

                    {/* Live Map Preview */}
                    <div style={{ height: '180px', width: '100%', borderRadius: '8px', overflow: 'hidden', margin: '16px 0', border: '1px solid var(--border-default)', position: 'relative', zIndex: 1 }}>
                      <MapContainer
                        center={[19.0760, 72.8777]}
                        zoom={11}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={false}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {pickupLocVal && pickupCoordsVal && (
                          <Marker position={[pickupCoordsVal.lat, pickupCoordsVal.lng]} icon={startIcon} />
                        )}
                        {destLocVal && destCoordsVal && (
                          <Marker position={[destCoordsVal.lat, destCoordsVal.lng]} icon={destIcon} />
                        )}
                        {pickupLocVal && pickupCoordsVal && destLocVal && destCoordsVal && (
                          <Polyline positions={[[pickupCoordsVal.lat, pickupCoordsVal.lng], [destCoordsVal.lat, destCoordsVal.lng]]} color="var(--accent-teal)" dashArray="5, 10" />
                        )}
                        <MapRecenter 
                          pickupCoords={pickupCoordsVal} 
                          destCoords={destCoordsVal} 
                        />
                      </MapContainer>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="text-meta">Commute Type</span>
                        <span className="text-body" style={{ fontWeight: '700', color: 'var(--accent-teal)' }}>
                          {activeSearchTab === 'find' ? 'Requesting Ride' : 'Offering Ride'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="text-meta">Date & Time</span>
                        <span className="text-body" style={{ fontWeight: '600' }}>
                          {activeSearchTab === 'find' ? (
                            (rideDate || 'Not selected') + (rideTime ? ` @ ${rideTime}` : '')
                          ) : (
                            formatOfferDateTime(offerDateTime)
                          )}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="text-meta">Required Seats</span>
                        <span className="text-body" style={{ fontWeight: '700' }}>
                          {activeSearchTab === 'find' ? numSeats : offerSeats} Seat{ (activeSearchTab === 'find' ? numSeats : offerSeats) !== '1' ? 's' : '' }
                        </span>
                      </div>
                      {activeSearchTab === 'offer' && selectedVehicle && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="text-meta">Vehicle Model</span>
                          <span className="text-body" style={{ fontWeight: '600' }}>
                            {userVehicles.find(v => v.id === selectedVehicle)?.model || 'Selected vehicle'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Sub-view: MY TRIPS & DETAIL & PAYMENT SCREENS */}
          {currentHeaderTab === 'trips' && (
            <div className="dashboard-container" style={{ maxWidth: '800px' }}>
              
              {/* Scenario A: Payment Successful Confirmation Screen */}
              {activePaymentMode === 'success' && paymentSuccessData && (
                <div style={{ textAlign: 'center', padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                  <div style={{ color: 'var(--color-brand)' }}>
                    <CheckCircle size={72} />
                  </div>
                  
                  <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
                    Payment Successful!
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '360px', margin: '0 auto' }}>
                    Your transaction has been processed. Trip details have been archived in your Ride History.
                  </p>

                  <div style={{ 
                    width: '100%', 
                    maxWidth: '400px', 
                    backgroundColor: 'var(--bg-input)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '12px', 
                    padding: '24px', 
                    marginTop: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    textAlign: 'left'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Amount Paid:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>₹ {paymentSuccessData.amount}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Payment Method:</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{paymentSuccessData.method}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Transaction ID:</span>
                      <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{paymentSuccessData.orderId}</span>
                    </div>
                  </div>

                  <button 
                    className="btn btn-primary" 
                    style={{ marginTop: '24px', padding: '0 32px', height: '44px' }}
                    onClick={() => {
                      setSelectedTrip(null);
                      setActivePaymentMode(null);
                      setCurrentHeaderTab('dashboard');
                    }}
                  >
                    Return to Dashboard
                  </button>
                </div>
              )}

              {/* Scenario B: Simulated Razorpay Payment Gateway Form */}
              {activePaymentMode === 'gateway' && razorpayOrder && (
                <div>
                  <button className="back-header" onClick={() => setActivePaymentMode('select')} style={{ marginBottom: '16px' }}>
                    <ArrowLeft size={16} />
                    <span>Cancel Checkout</span>
                  </button>

                  <div style={{ 
                    backgroundColor: 'var(--bg-input)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--radius-lg)', 
                    padding: '32px', 
                    maxWidth: '480px', 
                    margin: '0 auto',
                    boxShadow: 'var(--shadow-md)'
                  }}>
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                      <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        Simulated Razorpay Sandbox
                      </h2>
                      <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--color-brand)', marginTop: '8px' }}>
                        ₹ {selectedTrip.fare}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Order Ref: {razorpayOrder.orderId}
                      </div>
                    </div>

                    <form onSubmit={handleSimulatedPaymentSubmit} className="auth-form" style={{ gap: '16px' }}>
                      {paymentMethod === 'card' ? (
                        <>
                          <div className="form-group">
                            <label className="form-label">Card Number</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              style={{ paddingLeft: '16px' }}
                              placeholder="1234 5678 9012 3456" 
                              value={cardNum}
                              onChange={(e) => setCardNum(e.target.value)}
                              required 
                            />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="form-group">
                              <label className="form-label">Expiry Date</label>
                              <input 
                                type="text" 
                                className="input-field" 
                                style={{ paddingLeft: '16px' }}
                                placeholder="MM/YY" 
                                value={cardExpiry}
                                onChange={(e) => setCardExpiry(e.target.value)}
                                required 
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label">CVV</label>
                              <input 
                                type="password" 
                                className="input-field" 
                                style={{ paddingLeft: '16px' }}
                                placeholder="***" 
                                value={cardCvv}
                                onChange={(e) => setCardCvv(e.target.value)}
                                maxLength="3" 
                                required 
                              />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="form-group">
                          <label className="form-label">UPI VPA Address</label>
                          <input 
                            type="text" 
                            className="input-field" 
                            style={{ paddingLeft: '16px' }}
                            placeholder="username@bank" 
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            required 
                          />
                        </div>
                      )}

                      <button type="submit" className="btn btn-primary" style={{ height: '46px', marginTop: '12px' }} disabled={isLoadingData}>
                        {isLoadingData ? 'Authorizing transaction...' : `Pay ₹ ${selectedTrip.fare}`}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Scenario C: Payment Method Selector Screen */}
              {activePaymentMode === 'select' && selectedTrip && (
                <div>
                  <button className="back-header" onClick={() => setActivePaymentMode(null)} style={{ marginBottom: '16px' }}>
                    <ArrowLeft size={16} />
                    <span>Back to Summary</span>
                  </button>

                  <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>
                    Select Payment Method
                  </h2>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
                    
                    {/* Left Column: Trip Details & Method list selector */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      
                      {/* Trip Details display */}
                      <div style={{ 
                        backgroundColor: 'var(--bg-input)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: 'var(--radius-lg)', 
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                          Trip Information
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
                          <div>
                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10px', fontWeight: '500', marginBottom: '2px' }}>Driver</span>
                            <strong style={{ color: 'var(--text-primary)' }}>{selectedTrip.driver?.name || 'Carpool Driver'}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10px', fontWeight: '500', marginBottom: '2px' }}>Vehicle</span>
                            <strong style={{ color: 'var(--text-primary)' }}>{selectedTrip.vehicle ? `${selectedTrip.vehicle.model} (${selectedTrip.vehicle.registrationNumber})` : 'N/A'}</strong>
                          </div>
                          <div style={{ gridColumn: 'span 2' }}>
                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10px', fontWeight: '500', marginBottom: '2px' }}>Route</span>
                            <strong style={{ color: 'var(--text-primary)' }}>{selectedTrip.ride?.pickupAddress} to {selectedTrip.ride?.destAddress}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10px', fontWeight: '500', marginBottom: '2px' }}>Distance</span>
                            <strong style={{ color: 'var(--text-primary)' }}>{selectedTrip.ride?.distanceKm ? `${selectedTrip.ride.distanceKm} km` : 'N/A'}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10px', fontWeight: '500', marginBottom: '2px' }}>Fare</span>
                            <strong style={{ color: 'var(--text-primary)' }}>₹ {selectedTrip.fare}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Payment Methods */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        
                        {/* Card option */}
                        <label style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          padding: '16px 20px', 
                          borderRadius: 'var(--radius-md)', 
                          backgroundColor: 'var(--bg-input)', 
                          border: `1px solid ${paymentMethod === 'card' ? 'var(--color-brand)' : 'var(--border-color)'}`,
                          cursor: 'pointer',
                          transition: 'border 0.2s'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-primary)' }}>
                            <input 
                              type="radio" 
                              name="payment" 
                              checked={paymentMethod === 'card'} 
                              onChange={() => setPaymentMethod('card')} 
                              style={{ accentColor: 'var(--color-brand)' }}
                            />
                            <span style={{ fontSize: '14px', fontWeight: '600' }}>Card</span>
                          </div>
                          <CreditCard size={18} style={{ color: 'var(--text-secondary)' }} />
                        </label>

                        {/* UPI Option */}
                        <label style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          padding: '16px 20px', 
                          borderRadius: 'var(--radius-md)', 
                          backgroundColor: 'var(--bg-input)', 
                          border: `1px solid ${paymentMethod === 'upi' ? 'var(--color-brand)' : 'var(--border-color)'}`,
                          cursor: 'pointer',
                          transition: 'border 0.2s'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-primary)' }}>
                            <input 
                              type="radio" 
                              name="payment" 
                              checked={paymentMethod === 'upi'} 
                              onChange={() => setPaymentMethod('upi')} 
                              style={{ accentColor: 'var(--color-brand)' }}
                            />
                            <span style={{ fontSize: '14px', fontWeight: '600' }}>UPI</span>
                          </div>
                          <Smartphone size={18} style={{ color: 'var(--text-secondary)' }} />
                        </label>

                        {/* Wallet Option */}
                        <label style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          padding: '16px 20px', 
                          borderRadius: 'var(--radius-md)', 
                          backgroundColor: 'var(--bg-input)', 
                          border: `1px solid ${paymentMethod === 'wallet' ? 'var(--color-brand)' : 'var(--border-color)'}`,
                          cursor: 'pointer',
                          transition: 'border 0.2s'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-primary)' }}>
                            <input 
                              type="radio" 
                              name="payment" 
                              checked={paymentMethod === 'wallet'} 
                              onChange={() => setPaymentMethod('wallet')} 
                              style={{ accentColor: 'var(--color-brand)' }}
                            />
                            <span style={{ fontSize: '14px', fontWeight: '600' }}>Carpool Wallet</span>
                          </div>
                          <span style={{ fontSize: '13px', color: 'var(--color-brand)', fontWeight: '700' }}>
                            ₹ {walletBalance.toFixed(2)}
                          </span>
                        </label>

                      </div>

                    </div>

                    {/* Fare Summary Panel */}
                    <div style={{ 
                      backgroundColor: 'var(--bg-input)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: 'var(--radius-lg)', 
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '20px'
                    }}>
                      <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                        Fare Summary
                      </h3>

                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Ride Charges</span>
                        <span style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>₹ {selectedTrip.fare}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Total Payable Amount</span>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '20px' }}>₹ {selectedTrip.fare}</strong>
                      </div>

                      <button 
                        className="btn btn-primary" 
                        style={{ height: '46px', marginTop: '8px' }}
                        onClick={handleProceedPayment}
                        disabled={isLoadingData}
                      >
                        {isLoadingData ? 'Initiating Transaction...' : 'Proceed to Pay'}
                      </button>

                    </div>

                  </div>
                </div>
              )}

              {/* Scenario D: Default Active Trips Card Listings or Selected Trip details */}
              {!activePaymentMode && (
                <>
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

                        {/* ── TRIP DETAIL HERO CARD ── */}
                        <div style={{ 
                          backgroundColor: 'var(--bg-input)', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: '20px', 
                          overflow: 'hidden',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                        }}>

                          {/* Coloured top band with role + status */}
                          <div style={{
                            background: (selectedTrip.driverId === user?.id)
                              ? 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(20,184,166,0.10))'
                              : 'linear-gradient(135deg, rgba(59,130,246,0.18), rgba(99,102,241,0.10))',
                            borderBottom: '1px solid var(--border-color)',
                            padding: '18px 24px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{
                                width: '40px', height: '40px', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                backgroundColor: (selectedTrip.driverId === user?.id) ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)',
                                color: (selectedTrip.driverId === user?.id) ? '#10b981' : '#3b82f6',
                              }}>
                                {(selectedTrip.driverId === user?.id) ? <Car size={20} /> : <Users size={20} />}
                              </div>
                              <div>
                                <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                  {(selectedTrip.driverId === user?.id) ? 'You are the Driver' : (selectedTrip.driver?.name || 'Carpool Driver')}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                  {(selectedTrip.driverId === user?.id)
                                    ? (selectedTrip.passengers?.length > 0
                                        ? `${selectedTrip.passengers.length} passenger${selectedTrip.passengers.length > 1 ? 's' : ''}: ${selectedTrip.passengers.map(p => p.user?.name).join(', ')}`
                                        : 'No passengers booked yet')
                                    : `${selectedTrip.vehicle?.model || 'Vehicle'} · ${selectedTrip.vehicle?.registrationNumber || ''}`
                                  }
                                </div>
                              </div>
                            </div>
                            {getStatusBadge(selectedTrip.status)}
                          </div>

                          {/* Route timeline */}
                          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '0' }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'stretch' }}>
                              {/* Dot + line */}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20px', flexShrink: 0, paddingTop: '4px' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#3b82f6', border: '2px solid rgba(59,130,246,0.4)', flexShrink: 0 }} />
                                <div style={{ width: '2px', flex: 1, background: 'linear-gradient(to bottom, #3b82f6, var(--accent-teal))', margin: '6px 0', minHeight: '40px' }} />
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--accent-teal)', border: '2px solid rgba(20,184,166,0.4)', flexShrink: 0 }} />
                              </div>
                              {/* Addresses */}
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px' }}>
                                <div style={{ paddingBottom: '16px' }}>
                                  <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '3px' }}>Pickup</div>
                                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', lineHeight: 1.4 }}>{selectedTrip.ride?.pickupAddress}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '3px' }}>Drop-off</div>
                                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', lineHeight: 1.4 }}>{selectedTrip.ride?.destAddress}</div>
                                </div>
                              </div>
                            </div>

                            {/* Metadata row */}
                            <div style={{ 
                              display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '20px',
                              paddingTop: '20px', borderTop: '1px solid var(--border-color)'
                            }}>
                              <div style={{ flex: 1, minWidth: '80px', padding: '12px 16px', backgroundColor: 'rgba(11,15,25,0.5)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Date</div>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                  {selectedTrip.ride?.datetime ? new Date(selectedTrip.ride.datetime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                </div>
                              </div>
                              <div style={{ flex: 1, minWidth: '80px', padding: '12px 16px', backgroundColor: 'rgba(11,15,25,0.5)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Time</div>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                  {selectedTrip.ride?.datetime ? new Date(selectedTrip.ride.datetime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                                </div>
                              </div>
                              <div style={{ flex: 1, minWidth: '80px', padding: '12px 16px', backgroundColor: 'rgba(11,15,25,0.5)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Vehicle</div>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{selectedTrip.vehicle?.model || '—'}</div>
                              </div>
                              <div style={{ flex: 1, minWidth: '80px', padding: '12px 16px', backgroundColor: 'rgba(20,184,166,0.06)', borderRadius: '12px', border: '1px solid rgba(20,184,166,0.2)' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                  {selectedTrip.driverId === user?.id ? 'Earnings/seat' : 'Your Fare'}
                                </div>
                                <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--accent-teal)' }}>
                                  ₹{selectedTrip.fare > 0 ? selectedTrip.fare : (selectedTrip.ride?.farePerSeat || 0)}
                                </div>
                              </div>
                            </div>

                            {/* Stops info if any */}
                            {selectedTrip.ride?.stops && (() => {
                              try {
                                const stops = JSON.parse(selectedTrip.ride.stops);
                                return stops.length > 0 ? (
                                  <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', fontSize: '12px', color: '#f59e0b' }}>
                                    🛑 {stops.length} stop{stops.length > 1 ? 's' : ''}: {stops.map(s => s.address).join(' → ')}
                                  </div>
                                ) : null;
                              } catch { return null; }
                            })()}

                          </div>

                          {/* Action buttons footer */}
                          <div style={{ 
                            padding: '16px 24px 20px',
                            borderTop: '1px solid var(--border-color)',
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            flexWrap: 'wrap', 
                            gap: '12px',
                          }}>
                            
                            {/* Driver Status Transition Controls */}
                            {selectedTrip.driverId === user?.id ? (
                              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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

                                 {/* Driver: Track own route on map */}
                                {['booked', 'started', 'in_progress'].includes(selectedTrip.status) && (
                                  <button
                                    className="btn btn-secondary"
                                    style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '42px', padding: '0 16px' }}
                                    onClick={() => onNavigate('track-ride', {
                                      tripId: selectedTrip.id,
                                      tripStatus: selectedTrip.status,
                                      pickupLocation: selectedTrip.ride?.pickupAddress,
                                      destination: selectedTrip.ride?.destAddress,
                                      // Pass coords directly — avoids Nominatim re-geocoding
                                      pickupLat: selectedTrip.ride?.pickupLat,
                                      pickupLng: selectedTrip.ride?.pickupLng,
                                      destLat: selectedTrip.ride?.destLat,
                                      destLng: selectedTrip.ride?.destLng,
                                      driverName: user?.name,
                                      vehicleName: selectedTrip.vehicle?.model,
                                      vehicleReg: selectedTrip.vehicle?.registrationNumber
                                    })}
                                  >
                                    <Navigation size={16} />
                                    <span>View Route</span>
                                  </button>
                                )}

                                {/* Driver: Cancel trip (only when still booked) */}
                                {selectedTrip.status === 'booked' && (
                                  <button
                                    className="btn btn-secondary"
                                    style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '42px', padding: '0 16px', borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444' }}
                                    onClick={async () => {
                                      if (!window.confirm('Cancel this entire trip? All passengers will be notified and any wallet payments refunded.')) return;
                                      await handleUpdateStatus(selectedTrip.id, 'cancelled');
                                    }}
                                  >
                                    <span>Cancel Trip</span>
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
                              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                                {/* Passenger: Cancel booking before trip starts */}
                                {selectedTrip.status === 'booked' && (
                                  <button
                                    className="btn btn-secondary"
                                    style={{ height: '42px', padding: '0 16px', fontSize: '13px', borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444', display: 'flex', gap: '8px', alignItems: 'center' }}
                                    onClick={(e) => handleCancelBooking(selectedTrip, e)}
                                  >
                                    <span>Cancel Booking</span>
                                  </button>
                                )}
                                {selectedTrip.status === 'payment_pending' && (
                                  <button 
                                    className="btn btn-primary animate-pulse"
                                    style={{ height: '42px', padding: '0 24px', fontSize: '13px', fontWeight: '700' }}
                                    onClick={() => handleStartPaymentFlow(selectedTrip)}
                                  >
                                    Pay Now
                                  </button>
                                )}
                                {selectedTrip.status === 'payment_completed' && (
                                  <button 
                                    className="btn btn-secondary"
                                    style={{ height: '42px', padding: '0 24px', fontSize: '13px', fontWeight: '700', cursor: 'not-allowed', opacity: 0.8 }}
                                    disabled
                                  >
                                    ✅ Payment Completed
                                  </button>
                                )}
                                {selectedTrip.status !== 'payment_pending' && selectedTrip.status !== 'payment_completed' && (
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
                                      className="btn btn-primary" 
                                      style={{ height: '42px', padding: '0 16px', fontSize: '13px' }}
                                      onClick={() => onNavigate('track-ride', {
                                        tripId: selectedTrip.id,
                                        tripStatus: selectedTrip.status,
                                        pickupLocation: selectedTrip.ride?.pickupAddress,
                                        destination: selectedTrip.ride?.destAddress,
                                        // Pass coords directly — avoids Nominatim re-geocoding
                                        pickupLat: selectedTrip.ride?.pickupLat,
                                        pickupLng: selectedTrip.ride?.pickupLng,
                                        destLat: selectedTrip.ride?.destLat,
                                        destLng: selectedTrip.ride?.destLng,
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


                            {/* Fare details — fallback to farePerSeat when trip.fare is 0 (pre-payment) */}
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                ₹ {selectedTrip.fare > 0 ? selectedTrip.fare : (selectedTrip.ride?.farePerSeat || 0)}
                              </span>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {selectedTrip.driverId === user?.id ? ' per seat earnings' : ' fare per seat'}
                              </span>
                              {selectedTrip.ride?.stops && (() => {
                                try {
                                  const stops = JSON.parse(selectedTrip.ride.stops);
                                  return stops.length > 0 ? (
                                    <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '4px' }}>
                                      {stops.length} stop{stops.length > 1 ? 's' : ''}: {stops.map(s => s.address).join(' → ')}
                                    </div>
                                  ) : null;
                                } catch { return null; }
                              })()}
                            </div>

                          </div>
                        </div>

                        {/* Chat Panel Card */}
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
                    /* Scenario 2: Active Trips List (Loading skeletons integrated) */
                    <>
                      {/* Trips Page Header */}
                      <div style={{ marginBottom: '24px' }}>
                        <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>My Active Trips</h2>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Your current and upcoming bookings</p>
                      </div>

                      {isLoadingData && activeTrips.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <SkeletonCard />
                          <SkeletonCard />
                          <SkeletonCard />
                        </div>
                      ) : activeTrips.length === 0 ? (
                        <div style={{ 
                          textAlign: 'center', 
                          padding: '56px 24px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '12px',
                          backgroundColor: 'var(--bg-input)', 
                          border: '1px dashed var(--border-color)', 
                          borderRadius: '16px',
                        }}>
                          <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'rgba(20,184,166,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-teal)' }}>
                            <Navigation size={22} />
                          </div>
                          <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '15px' }}>No active trips yet</div>
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '260px' }}>Book a seat or offer your own ride to get started</div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {activeTrips.map((trip) => {
                            const isDriver = trip.driverId === user?.id;
                            const fare = trip.fare > 0 ? trip.fare : (trip.ride?.farePerSeat || 0);
                            return (
                              <div 
                                key={trip.id}
                                className="ride-card-hover"
                                onClick={() => setSelectedTrip(trip)}
                                style={{ 
                                  backgroundColor: 'var(--bg-input)', 
                                  border: '1px solid var(--border-color)', 
                                  borderRadius: '16px', 
                                  padding: '20px 24px', 
                                  cursor: 'pointer',
                                  transition: 'border-color 0.2s, box-shadow 0.2s',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '14px',
                                }}
                              >
                                {/* Top row: Role badge + status + fare */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ 
                                      fontSize: '10px', 
                                      fontWeight: '700', 
                                      letterSpacing: '0.6px',
                                      textTransform: 'uppercase',
                                      padding: '3px 9px', 
                                      borderRadius: '20px',
                                      backgroundColor: isDriver ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                                      color: isDriver ? '#10b981' : '#3b82f6',
                                      border: `1px solid ${isDriver ? 'rgba(16,185,129,0.25)' : 'rgba(59,130,246,0.25)'}`,
                                    }}>
                                      {isDriver ? '🚗  Driver' : '🧑  Passenger'}
                                    </span>
                                    {getStatusBadge(trip.status)}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ textAlign: 'right' }}>
                                      <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1 }}>₹{fare}</div>
                                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{isDriver ? 'per seat' : 'your fare'}</div>
                                    </div>
                                    {/* Quick actions on list */}
                                    {!isDriver && trip.status === 'booked' && (
                                      <button
                                        className="btn btn-secondary"
                                        style={{ height: '30px', padding: '0 12px', fontSize: '11px', fontWeight: '700', borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444' }}
                                        onClick={(e) => handleCancelBooking(trip, e)}
                                      >
                                        Cancel
                                      </button>
                                    )}
                                    {!isDriver && trip.status === 'payment_pending' && (
                                      <button
                                        className="btn btn-primary"
                                        style={{ height: '30px', padding: '0 14px', fontSize: '11px', fontWeight: '700' }}
                                        onClick={(e) => { e.stopPropagation(); handleStartPaymentFlow(trip); }}
                                      >
                                        Pay Now
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Route visual */}
                                <div style={{ display: 'flex', alignItems: 'stretch', gap: '12px' }}>
                                  {/* Timeline dots & line */}
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '3px', gap: 0, flexShrink: 0 }}>
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#3b82f6', flexShrink: 0 }} />
                                    <div style={{ width: '2px', flex: 1, background: 'linear-gradient(to bottom, #3b82f6, var(--accent-teal))', margin: '4px 0', minHeight: '24px' }} />
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--accent-teal)', flexShrink: 0 }} />
                                  </div>
                                  {/* Address labels */}
                                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px' }}>
                                    <div>
                                      <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Pickup</div>
                                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                                        {trip.ride?.pickupAddress?.split(',').slice(0, 2).join(',') || trip.ride?.pickupAddress}
                                      </div>
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Drop-off</div>
                                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                                        {trip.ride?.destAddress?.split(',').slice(0, 2).join(',') || trip.ride?.destAddress}
                                      </div>
                                    </div>
                                  </div>
                                  {/* Date/time pill */}
                                  <div style={{ 
                                    alignSelf: 'center',
                                    padding: '8px 12px',
                                    backgroundColor: 'rgba(11,15,25,0.5)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '10px',
                                    textAlign: 'center',
                                    flexShrink: 0
                                  }}>
                                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                      {trip.ride?.datetime ? new Date(trip.ride.datetime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                      {trip.ride?.datetime ? new Date(trip.ride.datetime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''}
                                    </div>
                                  </div>
                                </div>

                                {/* Footer: tap to view */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tap for details</span>
                                  <ArrowRight size={13} style={{ color: 'var(--text-muted)' }} />
                                </div>

                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

            </div>
          )}

          {/* Sub-view: MY VEHICLE (Normalized input validations and inline error alert blocks) */}
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <SkeletonCard />
                      <SkeletonCard />
                    </div>
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
                          
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                            <label className="toggle-wrapper" style={{ gap: '6px' }}>
                              <input
                                type="checkbox"
                                className="toggle-input"
                                checked={vehicle.status === 'active'}
                                onChange={() => handleToggleVehicleStatus(vehicle)}
                              />
                              <div className="toggle-switch" style={{ width: '38px', height: '20px' }}></div>
                              <span style={{ fontSize: '11px', color: vehicle.status === 'active' ? 'var(--color-brand)' : 'var(--text-muted)', fontWeight: '600' }}>
                                {vehicle.status === 'active' ? 'Active' : 'Inactive'}
                              </span>
                            </label>
                            
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ display: 'flex', gap: '4px', alignItems: 'center', height: '28px', padding: '0 8px', fontSize: '11px' }}
                              onClick={() => startEditVehicle(vehicle)}
                            >
                              <span>Edit Details</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add new vehicle form column (uppercase normalization and explicit error alerts) */}
                <div style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>
                    {editingVehicleId ? 'Edit Vehicle Details' : 'Register a Vehicle'}
                  </h2>
                  
                  {vehicleSuccess && (
                    <div className="feedback-alert feedback-success" style={{ marginBottom: '16px' }}>
                      <Check size={16} />
                      <span>{vehicleSuccess}</span>
                    </div>
                  )}

                  {vehicleError && (
                    <div className="feedback-alert feedback-error" style={{ marginBottom: '16px' }}>
                      <span>{vehicleError}</span>
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
                        style={{ paddingLeft: '16px', textTransform: 'uppercase' }}
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

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="submit" className="btn btn-primary" style={{ flex: 1, height: '44px', fontSize: '14px' }}>
                        {editingVehicleId ? <span>Update Vehicle</span> : <span>Register Vehicle</span>}
                      </button>
                      {editingVehicleId && (
                        <button 
                          type="button" 
                          className="btn btn-secondary" 
                          style={{ height: '44px', fontSize: '14px', padding: '0 16px' }}
                          onClick={cancelEditVehicle}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

              </div>

            </div>
          )}

          {/* Sub-view: RIDE HISTORY */}
          {currentHeaderTab === 'history' && (
            <div className="dashboard-container" style={{ maxWidth: '800px' }}>
              <button className="back-header" onClick={() => setCurrentHeaderTab('dashboard')}>
                <ArrowLeft size={16} />
                <span>Dashboard</span>
              </button>

              <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>Ride History</h2>
              
              {isLoadingData && historyTrips.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <SkeletonCard />
                  <SkeletonCard />
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {historyTrips.map(trip => {
                    const isDriver = trip.driverId === user?.id;
                    return (
                      <div 
                        key={trip.id}
                        style={{ 
                          backgroundColor: 'var(--bg-input)', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: 'var(--radius-lg)', 
                          padding: '24px', 
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '20px',
                          position: 'relative'
                        }}
                      >
                        {/* Header Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                            {isDriver ? 'Driver' : 'Passenger'}
                          </span>
                          {getStatusBadge(trip.status)}
                        </div>

                        {/* Profiles Row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ 
                            width: '46px', 
                            height: '46px', 
                            borderRadius: '50%', 
                            backgroundColor: 'var(--bg-card)', 
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-secondary)'
                          }}>
                            <Users size={24} />
                          </div>
                          <div>
                            {isDriver ? (
                              <>
                                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>You (Driver)</h3>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                  Passengers: {trip.passengers?.length > 0 
                                    ? trip.passengers.map(p => p.user?.name).join(', ') 
                                    : 'None.'}
                                </div>
                              </>
                            ) : (
                              <>
                                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                                  {trip.driver?.name || 'Carpool Driver'}
                                </h3>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                  Route: {trip.ride?.pickupAddress} to {trip.ride?.destAddress}
                                </div>
                              </>
                            )}
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {formatRideDate(trip.ride?.datetime)}
                            </div>
                          </div>
                        </div>

                        {/* Route/Vehicle Details Grid */}
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '1fr 1fr 1fr', 
                          gap: '16px', 
                          backgroundColor: 'rgba(11, 15, 25, 0.2)', 
                          padding: '16px', 
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)' 
                        }}>
                          <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '6px' }}>Vehicle</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                              <Car size={16} className="brand-logo" />
                              <div style={{ fontSize: '13px', fontWeight: '600' }}>{trip.vehicle?.model || 'Vehicle'}</div>
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '6px' }}>Pick UP Point</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontSize: '13px' }}>
                              <MapPin size={16} style={{ color: '#3b82f6' }} />
                              <strong>{trip.ride?.pickupAddress}</strong>
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '6px' }}>Drop Point</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontSize: '13px' }}>
                              <MapPin size={16} style={{ color: 'var(--color-brand)' }} />
                              <strong>{trip.ride?.destAddress}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Fare details */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                          <div>
                            <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>₹ {trip.fare}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}> {isDriver ? 'earned' : 'paid'}</span>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Sub-view: WALLET Tab */}
          {currentHeaderTab === 'wallet' && (
            <div className="dashboard-container" style={{ maxWidth: '850px' }}>
              
              <button className="back-header" onClick={() => setCurrentHeaderTab('dashboard')} style={{ marginBottom: '16px' }}>
                <ArrowLeft size={16} />
                <span>Recharge Wallet</span>
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', marginBottom: '32px' }}>
                
                {/* Recharge Card form */}
                <div style={{ 
                  backgroundColor: 'var(--bg-input)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-lg)', 
                  padding: '28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '24px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>Add Funds</h3>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Balance</span>
                      <strong style={{ fontSize: '20px', color: 'var(--color-brand)' }}>₹ {walletBalance.toFixed(2)}</strong>
                    </div>
                  </div>

                  <form onSubmit={handleRechargeSubmit} className="auth-form" style={{ gap: '20px' }}>
                    {/* Amount Input */}
                    <div className="form-group">
                      <label className="form-label">Amount (₹)</label>
                      <div className="input-icon-wrapper">
                        <div className="input-icon-left" style={{ fontWeight: '700', color: 'var(--text-muted)', fontSize: '14px' }}>
                          ₹
                        </div>
                        <input 
                          type="number" 
                          className="input-field" 
                          style={{ paddingLeft: '28px' }}
                          placeholder="e.g. 500" 
                          value={rechargeAmt}
                          onChange={(e) => setRechargeAmt(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Submit Add Money Button */}
                    <button type="submit" className="btn btn-primary" style={{ height: '44px', marginTop: '16px' }} disabled={isLoadingData}>
                      Add Money
                    </button>
                  </form>
                </div>

                {/* QR Code Scan Graphic */}
                <div style={{ 
                  backgroundColor: 'var(--bg-input)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-lg)', 
                  padding: '28px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ 
                    width: '120px', 
                    height: '120px', 
                    backgroundColor: '#fff', 
                    borderRadius: '8px', 
                    padding: '10px', 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(4, 1fr)', 
                    gridTemplateRows: 'repeat(4, 1fr)',
                    gap: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}>
                    {/* QR Blocks */}
                    <div style={{ backgroundColor: '#000', borderRadius: '2px' }}></div>
                    <div style={{ backgroundColor: '#000', borderRadius: '2px' }}></div>
                    <div style={{ backgroundColor: '#fff' }}></div>
                    <div style={{ backgroundColor: '#000', borderRadius: '2px' }}></div>
                    
                    <div style={{ backgroundColor: '#fff' }}></div>
                    <div style={{ backgroundColor: '#000', borderRadius: '2px' }}></div>
                    <div style={{ backgroundColor: '#000', borderRadius: '2px' }}></div>
                    <div style={{ backgroundColor: '#fff' }}></div>
                    
                    <div style={{ backgroundColor: '#000', borderRadius: '2px' }}></div>
                    <div style={{ backgroundColor: '#fff' }}></div>
                    <div style={{ backgroundColor: '#000', borderRadius: '2px' }}></div>
                    <div style={{ backgroundColor: '#000', borderRadius: '2px' }}></div>
                    
                    <div style={{ backgroundColor: '#000', borderRadius: '2px' }}></div>
                    <div style={{ backgroundColor: '#000', borderRadius: '2px' }}></div>
                    <div style={{ backgroundColor: '#fff' }}></div>
                    <div style={{ backgroundColor: '#000', borderRadius: '2px' }}></div>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '13px', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Scan to Pay</h4>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>Scan using any UPI app to recharge directly</p>
                  </div>
                </div>

              </div>

              {/* Transaction history list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                  Transaction History
                </h3>

                {walletTransactions.length === 0 ? (
                  <div style={{ 
                    padding: '24px', 
                    backgroundColor: 'rgba(11, 15, 25, 0.4)', 
                    border: '1px dashed var(--border-color)', 
                    borderRadius: '8px', 
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '12px'
                  }}>
                    No transactions recorded yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {walletTransactions.map(tx => {
                      const isDebit = tx.type === 'payment';
                      return (
                        <div key={tx.id} style={{ 
                          backgroundColor: 'var(--bg-input)', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: 'var(--radius-md)', 
                          padding: '16px 20px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                              {formatTransactionType(tx.type)}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                              {new Date(tx.createdAt).toLocaleString()} • Method: {tx.method}
                            </div>
                          </div>
                          
                          <div style={{ textAlign: 'right' }}>
                            <strong style={{ 
                              fontSize: '15px', 
                              color: isDebit ? '#ef4444' : 'var(--color-brand)' 
                            }}>
                              {isDebit ? '-' : '+'} ₹ {tx.amount}
                            </strong>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                              {tx.status}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Sub-view: REPORTS & ANALYTICS */}
          {currentHeaderTab === 'report' && (
            <div className="dashboard-container" style={{ maxWidth: '1000px' }}>
              
              <button className="back-header" onClick={() => setCurrentHeaderTab('dashboard')} style={{ marginBottom: '16px' }}>
                <ArrowLeft size={16} />
                <span>Reports & Analytics</span>
              </button>

              {reportSummary ? (
                (() => {
                  const hasNoData = (user?.role === 'admin' && reportSummary.totalCompletedRides === 0) || 
                                    (user?.role !== 'admin' && reportSummary.totalRidesCompleted === 0);

                  if (hasNoData) {
                    return (
                      <div style={{ 
                        backgroundColor: 'var(--bg-input)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: 'var(--radius-lg)', 
                        padding: '48px 32px',
                        textAlign: 'center', 
                        color: 'var(--text-muted)' 
                      }}>
                        <Activity size={48} style={{ color: 'var(--color-brand)', marginBottom: '16px' }} />
                        <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '600' }}>No Report Data Available</h3>
                        <p style={{ marginTop: '8px', fontSize: '13px' }}>
                          No report data available yet. Complete your first ride to generate analytics.
                        </p>
                      </div>
                    );
                  }

                  if (user?.role === 'admin') {
                    return (
                      <>
                        {/* Admin Stats Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                          
                          {/* Fleet Overview */}
                          <div style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>Fleet Overview</span>
                            <strong style={{ fontSize: '20px', color: '#3b82f6' }}>{reportSummary.totalEmployees} Employees</strong>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{reportSummary.totalVehicles} Registered Vehicles</span>
                          </div>

                          {/* Ride Summary */}
                          <div style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>Rides & Trips</span>
                            <strong style={{ fontSize: '20px', color: 'var(--color-brand)' }}>{reportSummary.totalCompletedRides} Completed</strong>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{reportSummary.totalRides} Offered ({reportSummary.activeRides} Active)</span>
                          </div>

                          {/* Cost & Revenue */}
                          <div style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>Org Financials</span>
                            <strong style={{ fontSize: '20px', color: '#06b6d4' }}>₹ {reportSummary.totalRevenue} Rev</strong>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cost: ₹ {reportSummary.totalTransportationCost} (Avg {reportSummary.avgRideDistance}km)</span>
                          </div>

                          {/* Environmental Impact */}
                          <div style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>Eco Savings</span>
                            <strong style={{ fontSize: '20px', color: '#10b981' }}>{reportSummary.co2SavedKg} kg CO₂</strong>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Fuel saved: {reportSummary.fuelSavedLiters} L (₹ {reportSummary.fuelSavedValue})</span>
                          </div>

                        </div>

                        {/* Admin Charts Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                          
                          {/* Monthly Rides Count */}
                          <div style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px', height: '320px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <h4 style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0, fontWeight: '600' }}>Monthly Completed Rides Count</h4>
                            <div style={{ width: '100%', height: '250px' }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={reportSummary.monthlyTrends}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                  <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} />
                                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} labelStyle={{ color: 'var(--text-primary)' }} />
                                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                                  <Bar dataKey="count" name="Rides" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {/* Monthly Revenue */}
                          <div style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px', height: '320px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <h4 style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0, fontWeight: '600' }}>Monthly Organization Revenue (₹)</h4>
                            <div style={{ width: '100%', height: '250px' }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={reportSummary.monthlyTrends}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                  <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} />
                                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} labelStyle={{ color: 'var(--text-primary)' }} />
                                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                                  <Bar dataKey="revenue" name="Revenue (₹)" fill="var(--color-brand)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                        </div>

                        {/* Top Drivers & Passengers Tables */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                          
                          {/* Active Drivers */}
                          <div>
                            <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>Most Active Drivers</h3>
                            <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                                <thead>
                                  <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>Driver</th>
                                    <th style={{ padding: '10px 16px', color: 'var(--text-muted)', textAlign: 'center' }}>Completed Trips</th>
                                    <th style={{ padding: '10px 16px', color: 'var(--text-muted)', textAlign: 'right' }}>Total Distance</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {reportSummary.mostActiveDrivers.length === 0 ? (
                                    <tr>
                                      <td colSpan="3" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>No drivers found.</td>
                                    </tr>
                                  ) : (
                                    reportSummary.mostActiveDrivers.map((driver, idx) => (
                                      <tr key={idx} style={{ borderBottom: idx === reportSummary.mostActiveDrivers.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '10px 16px' }}>
                                          <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{driver.name}</div>
                                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{driver.email}</div>
                                        </td>
                                        <td style={{ padding: '10px 16px', textAlign: 'center', color: 'var(--text-primary)' }}>{driver.count}</td>
                                        <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>{Math.round(driver.distance)} km</td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Active Passengers */}
                          <div>
                            <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>Most Active Passengers</h3>
                            <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                                <thead>
                                  <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>Passenger</th>
                                    <th style={{ padding: '10px 16px', color: 'var(--text-muted)', textAlign: 'center' }}>Completed Trips</th>
                                    <th style={{ padding: '10px 16px', color: 'var(--text-muted)', textAlign: 'right' }}>Total Distance</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {reportSummary.mostActivePassengers.length === 0 ? (
                                    <tr>
                                      <td colSpan="3" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>No passengers found.</td>
                                    </tr>
                                  ) : (
                                    reportSummary.mostActivePassengers.map((passenger, idx) => (
                                      <tr key={idx} style={{ borderBottom: idx === reportSummary.mostActivePassengers.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '10px 16px' }}>
                                          <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{passenger.name}</div>
                                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{passenger.email}</div>
                                        </td>
                                        <td style={{ padding: '10px 16px', textAlign: 'center', color: 'var(--text-primary)' }}>{passenger.count}</td>
                                        <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>{Math.round(passenger.distance)} km</td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                        </div>

                        {/* Vehicle Utilization Section */}
                        <div style={{ marginBottom: '24px' }}>
                          <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>Vehicle Utilization & Mileage Analysis</h3>
                          <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                              <thead>
                                <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Vehicle Model</th>
                                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Total Distance</th>
                                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', textAlign: 'center' }}>Completed Trips</th>
                                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', textAlign: 'right' }}>Est. Fuel Cost</th>
                                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', textAlign: 'right' }}>Est. Maintenance</th>
                                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', textAlign: 'right' }}>Net Profit (Fares)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {reportSummary.vehicleUtilization.length === 0 ? (
                                  <tr>
                                    <td colSpan="6" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>No vehicle usage registered.</td>
                                  </tr>
                                ) : (
                                  reportSummary.vehicleUtilization.map((vehicle, idx) => (
                                    <tr key={idx} style={{ borderBottom: idx === reportSummary.vehicleUtilization.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                                      <td style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-primary)' }}>{vehicle.vehicle}</td>
                                      <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{vehicle.distance} km</td>
                                      <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>{vehicle.trips}</td>
                                      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#ef4444' }}>₹ {vehicle.fuelCost}</td>
                                      <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>₹ {vehicle.maintenance}</td>
                                      <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--color-brand)', fontWeight: '700' }}>₹ {vehicle.netProfit}</td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>
                    );
                  } else {
                    return (
                      <>
                        {/* Employee Stats Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                          
                          {/* Trips Summary */}
                          <div style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>My Rides</span>
                            <strong style={{ fontSize: '20px', color: '#3b82f6' }}>{reportSummary.totalRidesCompleted} Completed</strong>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Offered: {reportSummary.totalRidesOffered} | Booked: {reportSummary.totalRidesBooked}</span>
                          </div>

                          {/* Wallet Transactions Summary */}
                          <div style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>Personal Spending</span>
                            <strong style={{ fontSize: '20px', color: '#ef4444' }}>₹ {reportSummary.totalAmountSpent} Spent</strong>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Earned as Driver: ₹ {reportSummary.totalAmountEarned}</span>
                          </div>

                          {/* Eco Savings */}
                          <div style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>My Carpool Savings</span>
                            <strong style={{ fontSize: '20px', color: '#10b981' }}>{reportSummary.co2SavedKg} kg CO₂ Saved</strong>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Fuel saved: {reportSummary.fuelSavedLiters} L (₹ {reportSummary.fuelSavedValue} saved)</span>
                          </div>

                        </div>

                        {/* Employee Charts Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                          
                          {/* Monthly Rides Count */}
                          <div style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px', height: '320px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <h4 style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0, fontWeight: '600' }}>My Monthly Completed Rides</h4>
                            <div style={{ width: '100%', height: '250px' }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={reportSummary.monthlyTrends}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                  <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} />
                                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} labelStyle={{ color: 'var(--text-primary)' }} />
                                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                                  <Bar dataKey="count" name="Rides" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {/* Monthly Spending & Earnings */}
                          <div style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px', height: '320px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <h4 style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0, fontWeight: '600' }}>Spending vs Earnings (₹)</h4>
                            <div style={{ width: '100%', height: '250px' }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={reportSummary.monthlyTrends}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                  <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} />
                                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} labelStyle={{ color: 'var(--text-primary)' }} />
                                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                                  <Bar dataKey="spending" name="Spent (₹)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                  <Bar dataKey="earnings" name="Earned (₹)" fill="var(--color-brand)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                        </div>

                        {/* Status Distribution & Wallet Summary Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                          
                          {/* Ride Status Distribution */}
                          <div style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px', height: '300px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <h4 style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0, fontWeight: '600' }}>Ride Status Distribution</h4>
                            <div style={{ width: '100%', height: '230px' }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={reportSummary.statusDistribution}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} labelStyle={{ color: 'var(--text-primary)' }} />
                                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                                  <Bar dataKey="value" name="Count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {/* Wallet Transactions Summary */}
                          <div>
                            <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>Wallet Transaction Summary</h3>
                            <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                                <thead>
                                  <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Transaction Type</th>
                                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', textAlign: 'center' }}>Total Operations</th>
                                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', textAlign: 'right' }}>Total Volume</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-primary)' }}>Completed Payments</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>{reportSummary.walletSummary.paymentCount}</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#ef4444', fontWeight: '700' }}>- ₹ {reportSummary.walletSummary.paymentSum}</td>
                                  </tr>
                                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-primary)' }}>Wallet Recharges</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>{reportSummary.walletSummary.rechargeCount}</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--color-brand)', fontWeight: '700' }}>+ ₹ {reportSummary.walletSummary.rechargeSum}</td>
                                  </tr>
                                  <tr style={{ borderBottom: 'none' }}>
                                    <td style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-primary)' }}>Refunds Received</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>{reportSummary.walletSummary.refundCount}</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#3b82f6', fontWeight: '700' }}>+ ₹ {reportSummary.walletSummary.refundSum}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                        </div>
                      </>
                    );
                  }
                })()
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              )}

            </div>
          )}

          {/* Sub-view: PLACEHOLDERS FOR Other TABS (Setting) */}
          {currentHeaderTab === 'setting' && (
            <SettingsTab onNavigate={handleTabChange} token={token} />
          )}

          {currentHeaderTab === 'saved-places' && (
            <SavedPlaces onBack={() => handleTabChange('setting')} token={token} />
          )}

          {currentHeaderTab === 'help' && (
            <Help onBack={() => handleTabChange('setting')} />
          )}

          {currentHeaderTab === 'chat' && (
            <Chat onBack={() => handleTabChange('setting')} token={token} user={user} />
          )}

          </div>
        </main>
      </div>

    </div>
  );
};

export default Dashboard;
