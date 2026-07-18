import React, { useState, useRef, useEffect } from 'react';
import { Car, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Header = ({ onProfileClick, currentTab, setCurrentTab, showTabs }) => {
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'trips',   label: 'My Trips' },
    { id: 'vehicle', label: 'My Vehicle' },
    { id: 'history', label: 'Ride History' },
    { id: 'wallet',  label: 'Wallet' },
    { id: 'setting', label: 'Setting' },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="app-header">
      {/* Brand logo & name */}
      <div className="header-left">
        <span className="brand-logo">
          <Car size={32} strokeWidth={2.5} />
        </span>
        <span className="brand-name">Carpooling</span>
      </div>

      {/* Navigation tabs - visible on Dashboard */}
      {showTabs && (
        <nav className="header-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`header-tab ${currentTab === tab.id ? 'active' : ''}`}
              onClick={() => setCurrentTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      )}

      {/* Profile + Logout area */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Profile click area */}
        <div
          className="header-profile-section"
          onClick={onProfileClick}
          title={user ? 'Edit Profile' : 'User Account'}
          style={{ cursor: 'pointer' }}
        >
          <div className="header-welcome">
            {user ? (
              <>
                <div>Welcome,</div>
                <div className="header-user-name">{user.name}</div>
              </>
            ) : (
              <div>Welcome</div>
            )}
          </div>
          <div className="header-avatar-container">
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt={user.name} className="header-avatar-img" />
            ) : (
              <User size={22} />
            )}
          </div>
        </div>

        {/* Logout button — only shown when logged in */}
        {user && (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              id="logout-btn"
              onClick={() => setShowMenu((v) => !v)}
              title="Logout"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                e.currentTarget.style.color = '#ef4444';
                e.currentTarget.style.borderColor = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--surface)';
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              <LogOut size={17} />
            </button>

            {/* Confirmation dropdown */}
            {showMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '14px 18px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                  whiteSpace: 'nowrap',
                  zIndex: 999,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  minWidth: '180px',
                }}
              >
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Sign out of your account?
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    id="logout-confirm-btn"
                    onClick={() => { setShowMenu(false); logout(); }}
                    style={{
                      flex: 1,
                      padding: '7px 0',
                      borderRadius: '7px',
                      border: 'none',
                      background: '#ef4444',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                  >
                    Logout
                  </button>
                  <button
                    onClick={() => setShowMenu(false)}
                    style={{
                      flex: 1,
                      padding: '7px 0',
                      borderRadius: '7px',
                      border: '1.5px solid var(--border)',
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
