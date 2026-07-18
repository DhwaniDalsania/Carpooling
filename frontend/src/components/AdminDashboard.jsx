import React, { useState, useEffect } from 'react';
import { 
  Users, Car, Settings, Plus, LogOut, Check, Loader2, Shield, 
  Building, Mail, MapPin, DollarSign, Fuel, ShieldAlert, CheckCircle2, Navigation
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AdminDashboard = () => {
  const { user, token, logout } = useAuth();
  
  // Tabs: 'employees', 'vehicles', 'settings'
  const [activeTab, setActiveTab] = useState('employees');

  // Stats Counters
  const [stats, setStats] = useState({
    totalEmployees: 0,
    registeredVehicles: 0,
    ridesThisMonth: 0
  });

  // Table Lists
  const [employees, setEmployees] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);

  // Settings State
  const [orgSettings, setOrgSettings] = useState({
    name: '',
    registeredAddress: '',
    industry: '',
    adminContact: '',
    fuelCostPerLitre: 96.50,
    costPerKm: 8.00,
    travelCostPerKm: 2.50,
    code: ''
  });

  // Add Employee Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmp, setNewEmp] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
    managerName: '',
    location: ''
  });
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Fetch Dashboard Stats Summary
  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch summary metrics', err);
    }
  };

  // Fetch Employees List
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/employees', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (err) {
      console.error('Failed to fetch employees list', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Vehicles List
  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/vehicles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVehicles(data);
      }
    } catch (err) {
      console.error('Failed to fetch vehicles list', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Configurations Settings
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrgSettings({
          name: data.name || '',
          registeredAddress: data.registeredAddress || '',
          industry: data.industry || '',
          adminContact: data.adminContact || '',
          fuelCostPerLitre: data.fuelCostPerLitre || 96.50,
          costPerKm: data.costPerKm || 8.00,
          travelCostPerKm: data.travelCostPerKm || 2.50,
          code: data.code || ''
        });
      }
    } catch (err) {
      console.error('Failed to fetch configurations settings', err);
    }
  };

  // Trigger data fetches on mount & tab updates
  useEffect(() => {
    if (!token) return;
    fetchSummary();
    if (activeTab === 'employees') fetchEmployees();
    if (activeTab === 'vehicles') fetchVehicles();
    if (activeTab === 'settings') fetchSettings();
  }, [token, activeTab]);

  // Toggle Employee access (Grant/Revoke)
  const handleToggleAccess = async (empId, currentAccess) => {
    try {
      const res = await fetch(`/api/admin/employees/${empId}/access`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ platformAccess: !currentAccess })
      });
      if (res.ok) {
        setEmployees(employees.map(emp => 
          emp.id === empId ? { ...emp, platformAccess: !currentAccess } : emp
        ));
      } else {
        const errData = await res.json();
        alert(errData.message || 'Failed to update access status.');
      }
    } catch (err) {
      alert('Network error updating access status.');
    }
  };

  // Toggle Vehicle Status (Active/Inactive)
  const handleToggleVehicleStatus = async (vehicleId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`/api/admin/vehicles/${vehicleId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        setVehicles(vehicles.map(v => 
          v.id === vehicleId ? { ...v, status: nextStatus } : v
        ));
        fetchSummary();
      } else {
        const errData = await res.json();
        alert(errData.message || 'Failed to update vehicle status.');
      }
    } catch (err) {
      alert('Network error updating vehicle status.');
    }
  };

  // Save Settings configurations
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orgSettings)
      });
      if (res.ok) {
        alert('Configurations saved successfully!');
        fetchSummary();
      } else {
        const errData = await res.json();
        alert(errData.message || 'Failed to save configuration settings.');
      }
    } catch (err) {
      alert('Network error saving configuration settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (orgSettings.code) {
      navigator.clipboard.writeText(orgSettings.code);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleRegenerateCode = async () => {
    const confirmRegen = window.confirm('Are you sure you want to regenerate the invite code? The old code will stop working immediately.');
    if (!confirmRegen) return;

    try {
      const res = await fetch('/api/admin/settings/regenerate-code', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setOrgSettings(prev => ({ ...prev, code: data.code }));
        alert('Invite code regenerated successfully!');
      } else {
        alert(data.message || 'Failed to regenerate invite code.');
      }
    } catch (err) {
      alert('Network error regenerating invite code.');
    }
  };

  // Register Employee Submit handler
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    
    if (!newEmp.name || !newEmp.email || !newEmp.password) {
      setFormError('Name, email, and password are required.');
      return;
    }

    try {
      const res = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newEmp)
      });
      const data = await res.json();
      if (res.ok) {
        setFormSuccess('Employee registered successfully!');
        setNewEmp({
          name: '',
          email: '',
          password: '',
          department: '',
          managerName: '',
          location: ''
        });
        fetchSummary();
        fetchEmployees();
        setTimeout(() => setShowAddModal(false), 1500);
      } else {
        setFormError(data.message || 'Registration failed.');
      }
    } catch (err) {
      setFormError('Network error registering employee.');
    }
  };

  return (
    <div className="app-container animate-fade-in" style={{ minHeight: '100vh', backgroundColor: '#05080f', color: '#f3f4f6' }}>
      {/* Admin Header */}
      <header className="header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px', backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', height: '70px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Shield className="brand-logo" size={26} style={{ color: 'var(--color-brand)' }} />
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', margin: 0, letterSpacing: '0.5px' }}>Admin Dashboard</h1>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Organization Console</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{user?.name || 'Administrator'}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{orgSettings.name || 'Enterprise Admin'}</div>
          </div>
          <button 
            className="btn btn-secondary" 
            onClick={logout}
            style={{ height: '36px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
          >
            <LogOut size={15} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Admin Body */}
      <div className="app-body-wrapper">
        <main className="app-content-area" style={{ padding: '24px', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* Counters Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                <Users size={22} />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Total Employees</span>
                <h3 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: '4px 0 0 0' }}>{stats.totalEmployees}</h3>
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-brand)' }}>
                <Car size={22} />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Registered Vehicles</span>
                <h3 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: '4px 0 0 0' }}>{stats.registeredVehicles}</h3>
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(249, 115, 22, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316' }}>
                <Navigation size={22} />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Rides This Month</span>
                <h3 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: '4px 0 0 0' }}>{stats.ridesThisMonth}</h3>
              </div>
            </div>
          </div>

          {/* Tabs Selector Navigation */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '24px', paddingBottom: '4px' }}>
            <button 
              onClick={() => setActiveTab('employees')}
              style={{ padding: '8px 12px', background: 'none', border: 'none', borderBottom: activeTab === 'employees' ? '2px solid var(--color-brand)' : 'none', color: activeTab === 'employees' ? 'var(--color-brand)' : 'var(--text-muted)', fontWeight: '700', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Users size={16} />
              <span>Employees</span>
            </button>
            <button 
              onClick={() => setActiveTab('vehicles')}
              style={{ padding: '8px 12px', background: 'none', border: 'none', borderBottom: activeTab === 'vehicles' ? '2px solid var(--color-brand)' : 'none', color: activeTab === 'vehicles' ? 'var(--color-brand)' : 'var(--text-muted)', fontWeight: '700', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Car size={16} />
              <span>Vehicles</span>
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              style={{ padding: '8px 12px', background: 'none', border: 'none', borderBottom: activeTab === 'settings' ? '2px solid var(--color-brand)' : 'none', color: activeTab === 'settings' ? 'var(--color-brand)' : 'var(--text-muted)', fontWeight: '700', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Settings size={16} />
              <span>Settings</span>
            </button>
          </div>

          {/* Sub-view Content Section */}
          <div style={{ minHeight: '400px' }}>

            {/* TAB: EMPLOYEES LIST */}
            {activeTab === 'employees' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Registered Employee Records</h2>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => setShowAddModal(true)}
                    style={{ height: '36px', padding: '0 14px', fontSize: '12px' }}
                  >
                    <Plus size={14} />
                    <span>Add Employee</span>
                  </button>
                </div>

                {loading && employees.length === 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                    <Loader2 className="animate-spin" size={28} />
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: 'var(--bg-card)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                           <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: '700' }}>Name</th>
                          <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: '700' }}>Email</th>
                          <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: '700' }}>Department</th>
                          <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: '700' }}>Manager</th>
                          <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: '700' }}>Office Location</th>
                          <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: '700' }}>Org Code</th>
                          <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: '700', textAlign: 'center' }}>Platform Access</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map(emp => (
                          <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '14px 16px', fontWeight: '600', color: 'var(--text-primary)' }}>
                              {emp.name} 
                              {emp.role === 'admin' && (
                                <span style={{ fontSize: '10px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>Admin</span>
                              )}
                            </td>
                            <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{emp.email}</td>
                            <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{emp.department || '—'}</td>
                            <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{emp.managerName || '—'}</td>
                            <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{emp.location || '—'}</td>
                            <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontWeight: '600' }}>{emp.organization?.code || '—'}</td>
                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                              {emp.role === 'admin' ? (
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Admin Role</span>
                              ) : (
                                <button 
                                  onClick={() => handleToggleAccess(emp.id, emp.platformAccess)}
                                  className={`btn`}
                                  style={{ 
                                    padding: '4px 10px', 
                                    fontSize: '11px', 
                                    height: '26px',
                                    borderRadius: '6px',
                                    backgroundColor: emp.platformAccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                    color: emp.platformAccess ? '#10b981' : '#ef4444',
                                    border: 'none',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {emp.platformAccess ? 'Granted' : 'Revoked'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB: VEHICLES LIST */}
            {activeTab === 'vehicles' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Registered Vehicles across Employees</h2>

                {loading && vehicles.length === 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                    <Loader2 className="animate-spin" size={28} />
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: 'var(--bg-card)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                          <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: '700' }}>Registration Number</th>
                          <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: '700' }}>Vehicle Model</th>
                          <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: '700' }}>Seating Capacity</th>
                          <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: '700' }}>Assigned Driver</th>
                          <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: '700', textAlign: 'center' }}>Approval Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vehicles.map(v => (
                          <tr key={v.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '14px 16px', fontWeight: '700', color: 'var(--text-primary)' }}>{v.registrationNumber}</td>
                            <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{v.model}</td>
                            <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{v.seatingCapacity} seats</td>
                            <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{v.driver}</td>
                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                              <button 
                                onClick={() => handleToggleVehicleStatus(v.id, v.status)}
                                className={`btn`}
                                style={{ 
                                  padding: '4px 10px', 
                                  fontSize: '11px', 
                                  height: '26px',
                                  borderRadius: '6px',
                                  backgroundColor: v.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                  color: v.status === 'active' ? '#10b981' : '#ef4444',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontWeight: '700'
                                }}
                              >
                                {v.status === 'active' ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                          </tr>
                        ))}
                        {vehicles.length === 0 && (
                          <tr>
                            <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No vehicles registered yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB: SETTINGS & CONFIGURATIONS */}
            {activeTab === 'settings' && (
              <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1000px' }}>
                
                {/* Organization Invite Code Card */}
                <div style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.03)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '12px', 
                  padding: '24px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-brand)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Organization Invite Code
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)', fontFamily: 'monospace', letterSpacing: '1px' }}>
                        {orgSettings.code || 'N/A'}
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ height: '32px', padding: '0 12px', fontSize: '11px', fontWeight: '600' }}
                          onClick={handleCopyCode}
                        >
                          {copySuccess ? 'Copied!' : 'Copy Code'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ height: '32px', padding: '0 12px', fontSize: '11px', fontWeight: '600', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ef4444' }}
                          onClick={handleRegenerateCode}
                        >
                          Regenerate Code
                        </button>
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right', maxWidth: '280px', lineHeight: '1.5' }}>
                    Share this code with employees so they can join your organization during sign up.
                  </div>
                </div>

                {/* Section: Company Details */}
                <div>
                  <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-brand)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                    Company Details
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Company Name</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        style={{ paddingLeft: '16px', height: '48px', backgroundColor: 'var(--bg-input)' }}
                        value={orgSettings.name}
                        onChange={e => setOrgSettings({ ...orgSettings, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Industry</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        style={{ paddingLeft: '16px', height: '48px', backgroundColor: 'var(--bg-input)' }}
                        value={orgSettings.industry}
                        onChange={e => setOrgSettings({ ...orgSettings, industry: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label className="form-label" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Registered Address</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      style={{ paddingLeft: '16px', height: '48px', backgroundColor: 'var(--bg-input)' }}
                      value={orgSettings.registeredAddress}
                      onChange={e => setOrgSettings({ ...orgSettings, registeredAddress: e.target.value })}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Admin Contact Email</label>
                      <input 
                        type="email" 
                        className="input-field" 
                        style={{ paddingLeft: '16px', height: '48px', backgroundColor: 'var(--bg-input)' }}
                        value={orgSettings.adminContact}
                        onChange={e => setOrgSettings({ ...orgSettings, adminContact: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total Registered Employees (Auto-calculated)</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        style={{ paddingLeft: '16px', height: '48px', backgroundColor: 'var(--bg-input)', opacity: 0.6, cursor: 'not-allowed' }}
                        value={stats.totalEmployees}
                        disabled
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Carpooling Configurations */}
                <div>
                  <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-brand)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                    Carpooling Configuration
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Fuel Cost / Litre (Rs.)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        className="input-field" 
                        style={{ paddingLeft: '16px', height: '48px', backgroundColor: 'var(--bg-input)' }}
                        value={orgSettings.fuelCostPerLitre}
                        onChange={e => setOrgSettings({ ...orgSettings, fuelCostPerLitre: parseFloat(e.target.value) || 0 })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Cost Per KM (Rs.)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        className="input-field" 
                        style={{ paddingLeft: '16px', height: '48px', backgroundColor: 'var(--bg-input)' }}
                        value={orgSettings.costPerKm}
                        onChange={e => setOrgSettings({ ...orgSettings, costPerKm: parseFloat(e.target.value) || 0 })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Travel Cost Per KM (Rs.)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        className="input-field" 
                        style={{ paddingLeft: '16px', height: '48px', backgroundColor: 'var(--bg-input)' }}
                        value={orgSettings.travelCostPerKm}
                        onChange={e => setOrgSettings({ ...orgSettings, travelCostPerKm: parseFloat(e.target.value) || 0 })}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Save button (aligned to bottom-left) */}
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '8px' }}>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loading}
                    style={{ height: '44px', padding: '0 24px', fontSize: '14px', fontWeight: '600' }}
                  >
                    {loading && <Loader2 className="animate-spin" size={16} style={{ marginRight: '8px' }} />}
                    <span>Save Settings</span>
                  </button>
                </div>

              </form>
            )}

          </div>

        </main>
      </div>

      {/* MODAL: ADD EMPLOYEE */}
      {showAddModal && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          backgroundColor: 'rgba(5, 8, 15, 0.85)', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(8px)' 
        }}>
          <div style={{ 
            backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', 
            borderRadius: '20px', width: '450px', padding: '32px', display: 'flex', 
            flexDirection: 'column', gap: '20px', boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Register New Employee</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {formSuccess && (
              <div className="feedback-alert feedback-success">
                <CheckCircle2 size={16} />
                <span>{formSuccess}</span>
              </div>
            )}
            
            {formError && (
              <div className="feedback-alert feedback-error">
                <ShieldAlert size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddEmployee} className="auth-form" style={{ gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Employee Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  style={{ paddingLeft: '16px' }}
                  placeholder="e.g. Raj Patel"
                  value={newEmp.name}
                  onChange={e => setNewEmp({ ...newEmp, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Work Email</label>
                <input 
                  type="email" 
                  className="input-field" 
                  style={{ paddingLeft: '16px' }}
                  placeholder="e.g. raj@acme.com"
                  value={newEmp.email}
                  onChange={e => setNewEmp({ ...newEmp, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="input-field" 
                  style={{ paddingLeft: '16px' }}
                  placeholder="Minimum 6 characters"
                  value={newEmp.password}
                  onChange={e => setNewEmp({ ...newEmp, password: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    style={{ paddingLeft: '16px' }}
                    placeholder="e.g. Engineering"
                    value={newEmp.department}
                    onChange={e => setNewEmp({ ...newEmp, department: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Manager</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    style={{ paddingLeft: '16px' }}
                    placeholder="e.g. A. Shah"
                    value={newEmp.managerName}
                    onChange={e => setNewEmp({ ...newEmp, managerName: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Office Location</label>
                <input 
                  type="text" 
                  className="input-field" 
                  style={{ paddingLeft: '16px' }}
                  placeholder="e.g. Gandhinagar"
                  value={newEmp.location}
                  onChange={e => setNewEmp({ ...newEmp, location: e.target.value })}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ height: '44px', fontSize: '13px', marginTop: '8px' }}
              >
                <Plus size={16} />
                <span>Add &amp; Grant Access</span>
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
