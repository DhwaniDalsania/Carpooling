import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, ArrowUpDown, Clock, Users, ChevronDown, Repeat, 
  Car, Calendar, Navigation, MessageSquare, 
  Phone, MapPin, MoreVertical, Plus, Trash2, Wallet, Settings, Activity,
  ArrowLeft, Check, Loader2, ArrowRight, Play, CheckCircle2, Send, PhoneOff,
  CreditCard, Smartphone, CheckCircle, RefreshCw
} from 'lucide-react';
import { io } from 'socket.io-client';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid 
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import Header from './Header';
import Sidebar from './Sidebar';

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
      bgColor = 'rgba(107, 114, 128, 0.2)';
      color = '#9ca3af';
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

  const formatTransactionType = (type) => {
    if (type === 'payment') return 'Ride Payment';
    if (type === 'recharge') return 'Wallet Recharge';
    return type;
  };
  
  // Dashboard Tabs (dashboard, trips, vehicle, history, wallet, setting, report)
  const [currentHeaderTab, setCurrentHeaderTab] = useState('dashboard');
  const [activeSearchTab, setActiveSearchTab] = useState('find'); // 'find' or 'offer'
  
  // Trip details drill-down state
  const [selectedTrip, setSelectedTrip] = useState(null);

  // Address search query suggestion states
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [offerPickupSuggestions, setOfferPickupSuggestions] = useState([]);
  const [offerDestSuggestions, setOfferDestSuggestions] = useState([]);

  // Resolved coordinate selection states (Requirement 2)
  const [pickupCoords, setPickupCoords] = useState(null); // { address, lat, lng }
  const [destCoords, setDestCoords] = useState(null); // { address, lat, lng }
  const [offerPickupCoords, setOfferPickupCoords] = useState(null); // { address, lat, lng }
  const [offerDestCoords, setOfferDestCoords] = useState(null); // { address, lat, lng }

  // Input textbox states
  const [pickupLoc, setPickupLoc] = useState('');
  const [destLoc, setDestLoc] = useState('');
  const [rideDate, setRideDate] = useState('');
  const [rideTime, setRideTime] = useState('');
  const [numSeats, setNumSeats] = useState('1');

  // Offer a Ride Form States
  const [offerPickup, setOfferPickup] = useState('');
  const [offerDest, setOfferDest] = useState('');
  const [offerDateTime, setOfferDateTime] = useState('');
  const [offerSeats, setOfferSeats] = useState('1');
  const [selectedVehicle, setSelectedVehicle] = useState('');

  // Dynamic lists from backend
  const [userVehicles, setUserVehicles] = useState([]);
  const [activeTrips, setActiveTrips] = useState([]);
  const [historyTrips, setHistoryTrips] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Wallet Tab States
  const [walletBalance, setWalletBalance] = useState(500);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [rechargeAmt, setRechargeAmt] = useState('500');
  const [rechargeMethod, setRechargeMethod] = useState('card'); // 'card' or 'upi'
  const [rechargeUpiId, setRechargeUpiId] = useState('');

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

  // Admin Dashboard States
  const [adminStats, setAdminStats] = useState({ totalEmployees: 0, registeredVehicles: 0, ridesThisMonth: 0 });
  const [adminTab, setAdminTab] = useState('employees'); // 'employees' | 'vehicles' | 'settings'
  const [employeesList, setEmployeesList] = useState([]);
  const [vehiclesList, setVehiclesList] = useState([]);
  const [adminSettings, setAdminSettings] = useState({
    name: '',
    registeredAddress: '',
    industry: '',
    adminContact: '',
    code: '',
    fuelCostPerLitre: 0,
    costPerKm: 0,
    travelCostPerKm: 0
  });

  // Modal / Add Employee / Settings Edit States
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpPassword, setNewEmpPassword] = useState('');
  const [newEmpDept, setNewEmpDept] = useState('');
  const [newEmpManager, setNewEmpManager] = useState('');
  const [newEmpLocation, setNewEmpLocation] = useState('');

  // Settings Edit states
  const [settingsName, setSettingsName] = useState('');
  const [settingsAddress, setSettingsAddress] = useState('');
  const [settingsIndustry, setSettingsIndustry] = useState('');
  const [settingsContact, setSettingsContact] = useState('');
  const [settingsFuelCost, setSettingsFuelCost] = useState('');
  const [settingsCostPerKm, setSettingsCostPerKm] = useState('');
  const [settingsTravelCost, setSettingsTravelCost] = useState('');

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

  // Debounce timers reference
  const debounceTimersRef = useRef({});

  // Sync tab with external navigation state updates
  useEffect(() => {
    if (dashboardState?.activeTab) {
      setCurrentHeaderTab(dashboardState.activeTab);
    }
  }, [dashboardState]);

  // ── Address Autocomplete Suggestions Query (Nominatim) ─────────────────────
  
  const fetchSuggestions = async (query, setSuggestions) => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      return;
    }

    if (nominatimCache[trimmed]) {
      setSuggestions(nominatimCache[trimmed]);
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
        setSuggestions(results);
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

  // ── Admin Dashboard Operations ──────────────────────────────────────────────

  const fetchAdminStats = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch admin stats', err);
    }
  };

  const fetchAdminEmployees = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/employees', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEmployeesList(data);
      }
    } catch (err) {
      console.error('Failed to fetch admin employees', err);
    }
  };

  const fetchAdminVehicles = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/vehicles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVehiclesList(data);
      }
    } catch (err) {
      console.error('Failed to fetch admin vehicles', err);
    }
  };

  const fetchAdminSettings = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminSettings(data);
        setSettingsName(data.name || '');
        setSettingsAddress(data.registeredAddress || '');
        setSettingsIndustry(data.industry || '');
        setSettingsContact(data.adminContact || '');
        setSettingsFuelCost(data.fuelCostPerLitre !== undefined ? String(data.fuelCostPerLitre) : '');
        setSettingsCostPerKm(data.costPerKm !== undefined ? String(data.costPerKm) : '');
        setSettingsTravelCost(data.travelCostPerKm !== undefined ? String(data.travelCostPerKm) : '');
      }
    } catch (err) {
      console.error('Failed to fetch admin settings', err);
    }
  };

  const handleToggleAccess = async (employeeId) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/employees/${employeeId}/access`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        await fetchAdminEmployees();
        await fetchAdminStats();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to toggle access.');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAdminToggleVehicleStatus = async (vehicleId, currentStatus) => {
    if (!token) return;
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`/api/admin/vehicles/${vehicleId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        await fetchAdminVehicles();
        await fetchAdminStats();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to toggle vehicle status.');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddEmployeeSubmit = async (e) => {
    e.preventDefault();
    if (!newEmpName || !newEmpEmail || !newEmpPassword) {
      alert('Please fill out all required fields.');
      return;
    }
    setIsLoadingData(true);
    try {
      const res = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newEmpName,
          email: newEmpEmail,
          password: newEmpPassword,
          department: newEmpDept,
          managerName: newEmpManager,
          location: newEmpLocation
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add employee.');

      alert('Employee added successfully!');
      setShowAddEmployeeModal(false);
      setNewEmpName('');
      setNewEmpEmail('');
      setNewEmpPassword('');
      setNewEmpDept('');
      setNewEmpManager('');
      setNewEmpLocation('');
      await fetchAdminEmployees();
      await fetchAdminStats();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSaveSettingsSubmit = async (e) => {
    e.preventDefault();
    setIsLoadingData(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: settingsName,
          registeredAddress: settingsAddress,
          industry: settingsIndustry,
          adminContact: settingsContact,
          fuelCostPerLitre: parseFloat(settingsFuelCost) || 0,
          costPerKm: parseFloat(settingsCostPerKm) || 0,
          travelCostPerKm: parseFloat(settingsTravelCost) || 0
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save settings.');

      alert('Settings updated successfully!');
      await fetchAdminSettings();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Load data dynamically based on active tab switching
  useEffect(() => {
    if (!token) return;

    if (user?.role === 'admin') {
      if (currentHeaderTab === 'dashboard') {
        fetchAdminStats();
        fetchAdminEmployees();
        fetchAdminVehicles();
        fetchAdminSettings();
      }
    } else {
      fetchVehicles();
      fetchTrips();
    }

    if (currentHeaderTab === 'history') {
      fetchHistory();
    } else if (currentHeaderTab === 'wallet') {
      fetchWalletData();
    } else if (currentHeaderTab === 'report') {
      fetchReportSummary();
    }
  }, [token, currentHeaderTab, user]);

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
  // Submit Find Ride (requires explicit selected Nominatim suggestions & phone verification)
  const handleFindSubmit = async (e) => {
    e.preventDefault();
    if (!pickupLoc.trim() || !destLoc.trim() || !rideDate || !rideTime || !numSeats || !phoneNum.trim()) {
      alert('All fields are required.');
      return;
    }

    if (!pickupCoords || pickupCoords.address !== pickupLoc) {
      alert('Please select a valid pickup location from the suggestions dropdown list.');
      return;
    }
    if (!destCoords || destCoords.address !== destLoc) {
      alert('Please select a valid destination location from the suggestions dropdown list.');
      return;
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
      pickupLocation: pickupCoords.address,
      pickupLat: pickupCoords.lat,
      pickupLng: pickupCoords.lng,
      destination: destCoords.address,
      destLat: destCoords.lat,
      destLng: destCoords.lng,
      date: rideDate,
      time: rideTime,
      seats: numSeats
    });
  };

  // Submit Offer Ride (requires explicit selected Nominatim suggestions & phone verification)
  const handleOfferSubmit = async (e) => {
    e.preventDefault();
    
    if (userVehicles.length === 0) {
      alert('You must register a vehicle first before offering a ride.');
      setCurrentHeaderTab('vehicle');
      return;
    }

    if (!offerPickup.trim() || !offerDest.trim() || !offerDateTime || !offerSeats || !selectedVehicle || !phoneNum.trim()) {
      alert('All fields are required.');
      return;
    }

    if (!offerPickupCoords || offerPickupCoords.address !== offerPickup) {
      alert('Please select a valid pickup location from the suggestions dropdown list.');
      return;
    }
    if (!offerDestCoords || offerDestCoords.address !== offerDest) {
      alert('Please select a valid destination location from the suggestions dropdown list.');
      return;
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
      pickupLocation: offerPickupCoords.address,
      pickupLat: offerPickupCoords.lat,
      pickupLng: offerPickupCoords.lng,
      destination: offerDestCoords.address,
      destLat: offerDestCoords.lat,
      destLng: offerDestCoords.lng,
      dateTime: offerDateTime,
      seats: offerSeats,
      vehicleId: selectedVehicle,
      vehicle: selectedCar ? `${selectedCar.model} (${selectedCar.registrationNumber})` : 'Registered Vehicle'
    });
  };

  // Add Vehicle Submit (upper-cased registration code checks)
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
      const res = await fetch('/api/vehicles', {
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
    } catch (err) {
      setVehicleError(err.message);
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

  // Driver cancels their entire ride offer (before trip starts)
  const handleCancelRide = async (rideId) => {
    if (!window.confirm('Are you sure you want to cancel this ride? All passengers will be removed and refunded.')) return;
    setIsLoadingData(true);
    try {
      const res = await fetch(`/api/rides/${rideId}/cancel`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to cancel ride.');
      alert('✅ Ride cancelled. All passengers have been notified and refunded.');
      setSelectedTrip(null);
      await fetchTrips();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Passenger cancels their own booking
  const handleCancelBooking = async (trip) => {
    if (!window.confirm('Are you sure you want to cancel your booking? You will be removed from this ride.')) return;

    // Find the booking id — we need to fetch it first via the bookings endpoint
    setIsLoadingData(true);
    try {
      // Fetch all bookings for this ride to find this passenger's booking
      const bRes = await fetch(`/api/rides/${trip.rideId}/bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let bookingId = null;
      if (bRes.ok) {
        const bookings = await bRes.json();
        const myBooking = bookings.find(b => b.passengerId === user?.id && b.status === 'confirmed');
        bookingId = myBooking?.id;
      }

      if (!bookingId) {
        // Fallback: derive bookingId from trip metadata if API unavailable
        throw new Error('Could not find your booking for this ride. Please refresh and try again.');
      }

      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to cancel booking.');
      alert('✅ Booking cancelled. Your seat has been released.');
      setSelectedTrip(null);
      await fetchTrips();
    } catch (err) {
      alert(err.message);
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
      console.info('[recharge] Creating Razorpay order for wallet top-up', { amount: amountVal, method: rechargeMethod });

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
            setRechargeUpiId('');
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
        method: rechargeMethod === 'card' ? { card: true } : { upi: true },
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

  return (
    <div className="app-container animate-fade-in">
      {/* Header Bar */}
      <Header
        onProfileClick={onProfileClick}
        currentTab={currentHeaderTab}
        setCurrentTab={(tabId) => {
          setCurrentHeaderTab(tabId);
          setSelectedTrip(null); 
          setActivePaymentMode(null);
        }}
        showTabs={true}
      />

      {/* Main layout */}
      <div className="app-body-wrapper">
        <Sidebar label={getSidebarLabel()} />

        <main className="app-content-area">
          
          {/* Sub-view: DASHBOARD SEARCH/OFFER FORMS */}
          {currentHeaderTab === 'dashboard' && (
            user?.role === 'admin' ? (
              <div className="admin-dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
                
                {/* 1. Admin Top Stat Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                  <div style={{
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '24px',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Employees</div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--color-brand)', marginTop: '8px' }}>
                      {adminStats.totalEmployees}
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '24px',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Registered Vehicles</div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: '#3b82f6', marginTop: '8px' }}>
                      {adminStats.registeredVehicles}
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '24px',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rides This Month</div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: '#ec4899', marginTop: '8px' }}>
                      {adminStats.ridesThisMonth}
                    </div>
                  </div>
                </div>

                {/* 2. Admin Three-Tab Navigation */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '16px' }}>
                  {['employees', 'vehicles', 'settings'].map((tab) => (
                    <button
                      key={tab}
                      style={{
                        padding: '12px 24px',
                        fontSize: '14px',
                        fontWeight: '700',
                        color: adminTab === tab ? 'var(--color-brand)' : 'var(--text-secondary)',
                        border: 'none',
                        borderBottom: adminTab === tab ? '3px solid var(--color-brand)' : '3px solid transparent',
                        background: 'transparent',
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => setAdminTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* 3. Tab Content Area */}
                <div style={{
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px',
                  boxShadow: 'var(--shadow-md)'
                }}>
                  {adminTab === 'employees' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>Employees Directory</h3>
                        <button className="btn btn-primary" style={{ height: '36px', fontSize: '13px' }} onClick={() => setShowAddEmployeeModal(true)}>
                          + Add Employee
                        </button>
                      </div>

                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                              <th style={{ padding: '12px 16px' }}>Name</th>
                              <th style={{ padding: '12px 16px' }}>Email</th>
                              <th style={{ padding: '12px 16px' }}>Department</th>
                              <th style={{ padding: '12px 16px' }}>Manager</th>
                              <th style={{ padding: '12px 16px' }}>Location</th>
                              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Platform Access</th>
                            </tr>
                          </thead>
                          <tbody>
                            {employeesList.map((emp) => (
                              <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-primary)' }}>{emp.name}</td>
                                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{emp.email}</td>
                                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{emp.department || '-'}</td>
                                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{emp.managerName || '-'}</td>
                                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{emp.location || '-'}</td>
                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                  <button
                                    className={`btn ${emp.platformAccess ? 'btn-secondary' : 'btn-primary'}`}
                                    style={{
                                      height: '28px',
                                      padding: '0 12px',
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      borderColor: emp.platformAccess ? 'var(--color-brand)' : '#ef4444',
                                      color: emp.platformAccess ? 'var(--color-brand)' : '#ef4444',
                                      backgroundColor: emp.platformAccess ? 'rgba(15, 169, 88, 0.1)' : 'rgba(239, 68, 68, 0.1)'
                                    }}
                                    onClick={() => handleToggleAccess(emp.id)}
                                  >
                                    {emp.platformAccess ? 'Granted' : 'Revoked'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {adminTab === 'vehicles' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>Registered Vehicles</h3>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                              <th style={{ padding: '12px 16px' }}>Registration Number</th>
                              <th style={{ padding: '12px 16px' }}>Model</th>
                              <th style={{ padding: '12px 16px' }}>Seating Capacity</th>
                              <th style={{ padding: '12px 16px' }}>Driver</th>
                              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {vehiclesList.map((veh) => (
                              <tr key={veh.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-primary)' }}>{veh.registrationNumber}</td>
                                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{veh.model}</td>
                                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{veh.seatingCapacity} seats</td>
                                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{veh.driver}</td>
                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                  <button
                                    className={`btn ${veh.status === 'active' ? 'btn-secondary' : 'btn-primary'}`}
                                    style={{
                                      height: '28px',
                                      padding: '0 12px',
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      borderColor: veh.status === 'active' ? 'var(--color-brand)' : '#ef4444',
                                      color: veh.status === 'active' ? 'var(--color-brand)' : '#ef4444',
                                      backgroundColor: veh.status === 'active' ? 'rgba(15, 169, 88, 0.1)' : 'rgba(239, 68, 68, 0.1)'
                                    }}
                                    onClick={() => handleAdminToggleVehicleStatus(veh.id, veh.status)}
                                  >
                                    {veh.status === 'active' ? 'Active' : 'Inactive'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {adminTab === 'settings' && (
                    <form onSubmit={handleSaveSettingsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      <div>
                        <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '700', color: 'var(--color-brand)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Company Details</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                          <div className="form-group">
                            <label className="form-label">Company Name</label>
                            <input
                              type="text"
                              className="input-field"
                              value={settingsName}
                              onChange={(e) => setSettingsName(e.target.value)}
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Industry</label>
                            <input
                              type="text"
                              className="input-field"
                              value={settingsIndustry}
                              onChange={(e) => setSettingsIndustry(e.target.value)}
                              required
                            />
                          </div>
                          <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label className="form-label">Registered Address</label>
                            <input
                              type="text"
                              className="input-field"
                              value={settingsAddress}
                              onChange={(e) => setSettingsAddress(e.target.value)}
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Admin Contact Email</label>
                            <input
                              type="email"
                              className="input-field"
                              value={settingsContact}
                              onChange={(e) => setSettingsContact(e.target.value)}
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Total Registered Employees (Auto-calculated)</label>
                            <input
                              type="text"
                              className="input-field"
                              value={adminStats.totalEmployees}
                              disabled
                              style={{ cursor: 'not-allowed', opacity: 0.6 }}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '700', color: 'var(--color-brand)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Carpooling Configuration</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                          <div className="form-group">
                            <label className="form-label">Fuel Cost / Litre (Rs.)</label>
                            <input
                              type="number"
                              step="0.01"
                              className="input-field"
                              value={settingsFuelCost}
                              onChange={(e) => setSettingsFuelCost(e.target.value)}
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Cost Per KM (Rs.)</label>
                            <input
                              type="number"
                              step="0.01"
                              className="input-field"
                              value={settingsCostPerKm}
                              onChange={(e) => setSettingsCostPerKm(e.target.value)}
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Travel Cost Per KM (Rs.)</label>
                            <input
                              type="number"
                              step="0.01"
                              className="input-field"
                              value={settingsTravelCost}
                              onChange={(e) => setSettingsTravelCost(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', height: '42px', padding: '0 24px' }}>
                        Save Settings
                      </button>
                    </form>
                  )}
                </div>

                {/* 4. Add Employee Modal */}
                {showAddEmployeeModal && (
                  <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 99999,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                  }}>
                    <div style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '32px',
                      maxWidth: '500px',
                      width: '100%',
                      boxShadow: 'var(--shadow-lg)'
                    }}>
                      <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>Add New Employee</h3>
                      <form onSubmit={handleAddEmployeeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="form-group">
                          <label className="form-label">Full Name *</label>
                          <input
                            type="text"
                            className="input-field"
                            value={newEmpName}
                            onChange={(e) => setNewEmpName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Email Address *</label>
                          <input
                            type="email"
                            className="input-field"
                            value={newEmpEmail}
                            onChange={(e) => setNewEmpEmail(e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Password *</label>
                          <input
                            type="password"
                            className="input-field"
                            value={newEmpPassword}
                            onChange={(e) => setNewEmpPassword(e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Department</label>
                          <input
                            type="text"
                            className="input-field"
                            value={newEmpDept}
                            onChange={(e) => setNewEmpDept(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Manager Name</label>
                          <input
                            type="text"
                            className="input-field"
                            value={newEmpManager}
                            onChange={(e) => setNewEmpManager(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Office Location</label>
                          <input
                            type="text"
                            className="input-field"
                            value={newEmpLocation}
                            onChange={(e) => setNewEmpLocation(e.target.value)}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                          <button type="submit" className="btn btn-primary" style={{ flex: 1, height: '40px' }} disabled={isLoadingData}>
                            {isLoadingData ? 'Adding...' : 'Add Employee'}
                          </button>
                          <button type="button" className="btn btn-secondary" style={{ flex: 1, height: '40px' }} onClick={() => setShowAddEmployeeModal(false)}>
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

              </div>
            ) : (
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
                      <div className="form-group" style={{ position: 'relative' }}>
                        <label className="form-label">Pickup Location</label>
                        <div className="input-icon-wrapper">
                          <div className="input-icon-left">
                            <Search size={18} />
                          </div>
                          <input
                            type="text"
                            className="input-field"
                            placeholder="Search pickup location..."
                            value={pickupLoc}
                            onChange={(e) => handleLocationInputChange(e.target.value, 'find_pickup', setPickupLoc, setPickupSuggestions)}
                            required
                          />
                        </div>
                        
                        {/* Suggestions list dropdown menu */}
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
                                {suggestion.address}
                              </li>
                            ))}
                          </ul>
                        )}
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

                      <div className="form-group" style={{ position: 'relative' }}>
                        <label className="form-label">Destination Location</label>
                        <div className="input-icon-wrapper">
                          <div className="input-icon-left">
                            <Search size={18} />
                          </div>
                          <input
                            type="text"
                            className="input-field"
                            placeholder="Search destination location..."
                            value={destLoc}
                            onChange={(e) => handleLocationInputChange(e.target.value, 'find_dest', setDestLoc, setDestSuggestions)}
                            required
                          />
                        </div>

                        {/* Suggestions list dropdown menu */}
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
                                {suggestion.address}
                              </li>
                            ))}
                          </ul>
                        )}
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
                      <label className="form-label">Phone Number</label>
                      <div className="input-icon-wrapper">
                        <div className="input-icon-left">
                          <Phone size={18} style={{ transform: 'rotate(90deg)' }} />
                        </div>
                        <input
                          type="tel"
                          className="input-field"
                          placeholder="Enter your phone number..."
                          value={phoneNum}
                          onChange={(e) => setPhoneNum(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <button type="submit" className="btn btn-primary">
                      <Navigation size={18} />
                      <span>Find Ride</span>
                    </button>
                  </form>
                )}

                {/* Offer a Ride Form (Recurring rides checkbox and Fare input removed completely) */}
                {activeSearchTab === 'offer' && (
                  <form onSubmit={handleOfferSubmit} className="auth-form">
                    <div className="locations-container">
                      <div className="form-group" style={{ position: 'relative' }}>
                        <label className="form-label">Pickup Location</label>
                        <div className="input-icon-wrapper">
                          <div className="input-icon-left">
                            <Search size={18} />
                          </div>
                          <input
                            type="text"
                            className="input-field"
                            placeholder="Search pickup location..."
                            value={offerPickup}
                            onChange={(e) => handleLocationInputChange(e.target.value, 'offer_pickup', setOfferPickup, setOfferPickupSuggestions)}
                            required
                          />
                        </div>

                        {/* Suggestions list dropdown menu */}
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
                                {suggestion.address}
                              </li>
                            ))}
                          </ul>
                        )}
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

                      <div className="form-group" style={{ position: 'relative' }}>
                        <label className="form-label">Destination Location</label>
                        <div className="input-icon-wrapper">
                          <div className="input-icon-left">
                            <Search size={18} />
                          </div>
                          <input
                            type="text"
                            className="input-field"
                            placeholder="Search destination location..."
                            value={offerDest}
                            onChange={(e) => handleLocationInputChange(e.target.value, 'offer_dest', setOfferDest, setOfferDestSuggestions)}
                            required
                          />
                        </div>

                        {/* Suggestions list dropdown menu */}
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
                                {suggestion.address}
                              </li>
                            ))}
                          </ul>
                        )}
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

                    <div className="form-group">
                      <label className="form-label">Phone Number</label>
                      <div className="input-icon-wrapper">
                        <div className="input-icon-left">
                          <Phone size={18} style={{ transform: 'rotate(90deg)' }} />
                        </div>
                        <input
                          type="tel"
                          className="input-field"
                          placeholder="Enter your phone number..."
                          value={phoneNum}
                          onChange={(e) => setPhoneNum(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <button type="submit" className="btn btn-primary">
                      <Car size={18} />
                      <span>Offer Ride</span>
                    </button>
                  </form>
                )}
              </div>
            )
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

                                {/* Driver Cancel Ride — only available before trip starts */}
                                {selectedTrip.status === 'booked' && (
                                  <button
                                    className="btn btn-secondary"
                                    style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '42px', padding: '0 16px', color: '#ef4444', borderColor: '#ef4444' }}
                                    onClick={() => handleCancelRide(selectedTrip.rideId)}
                                    disabled={isLoadingData}
                                  >
                                    <span>✕ Cancel Ride</span>
                                  </button>
                                )}
                              </div>
                            ) : (
                              /* Passenger Controls & Pay Now button */
                              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
                                {/* Passenger Cancel Booking — only available before trip starts */}
                                {selectedTrip.status === 'booked' && (
                                  <button
                                    className="btn btn-secondary"
                                    style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '42px', padding: '0 16px', color: '#ef4444', borderColor: '#ef4444' }}
                                    onClick={() => handleCancelBooking(selectedTrip)}
                                    disabled={isLoadingData}
                                  >
                                    <span>✕ Cancel Booking</span>
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


                            {/* Fare details (Formatted with Rupee symbol) */}
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
                      <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>My Active Trips</h2>

                      {isLoadingData && activeTrips.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <SkeletonCard />
                          <SkeletonCard />
                          <SkeletonCard />
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
                                  {!isDriver && trip.status === 'payment_pending' && (
                                    <button
                                      className="btn btn-primary"
                                      style={{ height: '32px', padding: '0 12px', fontSize: '11px', fontWeight: '700' }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStartPaymentFlow(trip);
                                      }}
                                    >
                                      Pay Now
                                    </button>
                                  )}
                                  {!isDriver && trip.status === 'payment_completed' && (
                                    <button
                                      className="btn btn-secondary"
                                      style={{ height: '32px', padding: '0 12px', fontSize: '11px', fontWeight: '700', cursor: 'not-allowed', opacity: 0.7 }}
                                      disabled
                                    >
                                      ✅ Payment Completed
                                    </button>
                                  )}
                                  {!(!isDriver && (trip.status === 'payment_pending' || trip.status === 'payment_completed')) && (
                                    <ArrowRight size={18} style={{ color: 'var(--text-muted)' }} />
                                  )}
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

                {/* Add new vehicle form column (uppercase normalization and explicit error alerts) */}
                <div style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>Register a Vehicle</h2>
                  
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

                    <button type="submit" className="btn btn-primary" style={{ height: '44px', fontSize: '14px' }}>
                      <Plus size={16} />
                      <span>Register Vehicle</span>
                    </button>
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

                    {/* Method Radio Options */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        fontSize: '13px', 
                        color: 'var(--text-primary)',
                        cursor: 'pointer'
                      }}>
                        <input 
                          type="radio" 
                          name="rechargeMethod"
                          checked={rechargeMethod === 'card'} 
                          onChange={() => setRechargeMethod('card')}
                          style={{ accentColor: 'var(--color-brand)' }}
                        />
                        <span>Card Payment</span>
                      </label>

                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        fontSize: '13px', 
                        color: 'var(--text-primary)',
                        cursor: 'pointer'
                      }}>
                        <input 
                          type="radio" 
                          name="rechargeMethod"
                          checked={rechargeMethod === 'upi'} 
                          onChange={() => setRechargeMethod('upi')}
                          style={{ accentColor: 'var(--color-brand)' }}
                        />
                        <span>UPI Payment</span>
                      </label>
                    </div>

                    {rechargeMethod === 'upi' && (
                      <div className="form-group">
                        <label className="form-label">UPI ID (@ABCD)</label>
                        <input 
                          type="text" 
                          className="input-field" 
                          style={{ paddingLeft: '16px' }}
                          placeholder="yourname@bank" 
                          value={rechargeUpiId}
                          onChange={(e) => setRechargeUpiId(e.target.value)}
                          required
                        />
                      </div>
                    )}

                    {/* Submit Add Money Button */}
                    <button type="submit" className="btn btn-primary" style={{ height: '44px', marginTop: '8px' }} disabled={isLoadingData}>
                      Add ₹ {rechargeAmt || '0'}
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
            <div className="dashboard-container" style={{ maxWidth: '600px', alignItems: 'center', textAlign: 'center', padding: '48px 32px' }}>
              
              <Settings size={48} className="brand-logo" style={{ marginBottom: '16px' }} />
              <h2>System Settings</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Account preferences, notification parameters, and privacy controls.</p>

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
