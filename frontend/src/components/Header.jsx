import React, { useState, useRef, useEffect } from 'react';
import { Car, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Header = ({ onProfileClick, currentTab, setCurrentTab, showTabs }) => {
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef(null);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'trips',   label: 'My Trips' },
    { id: 'vehicle', label: 'My Vehicle' },
    { id: 'history', label: 'Ride History' },
    { id: 'wallet',  label: 'Wallet' },
    { id: 'setting', label: 'Setting' },
    { id: 'report',  label: 'Report' },
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

  // Monitor page scroll coordinates to trigger visual shadow header transition
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const placeholderAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E";

  return (
    <header className={`app-header ${scrolled ? 'scrolled' : ''}`}>
      {/* Brand logo & name */}
      <div className="header-left" onClick={() => setCurrentTab('dashboard')}>
        <span className="brand-logo">
          <Car size={32} strokeWidth={2.5} />
        </span>
        <span className="brand-name">FindMeARide</span>
      </div>

      {/* Navigation tabs - visible on Dashboard */}
      {showTabs && (
        <nav className="header-tabs">
          {tabs.map((tab) => {
            const isTabActive = currentTab === tab.id || 
              (tab.id === 'setting' && ['saved-places', 'help', 'chat'].includes(currentTab));
            return (
              <button
                key={tab.id}
                className={`header-tab ${isTabActive ? 'active' : ''}`}
                onClick={() => setCurrentTab(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
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
              <img 
                src={user.photoUrl} 
                alt={user.name} 
                className="header-avatar-img" 
                onError={(e) => { e.currentTarget.src = placeholderAvatar; }}
              />
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
