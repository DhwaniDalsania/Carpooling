import React from 'react';
import { Car, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Header = ({ onProfileClick, currentTab, setCurrentTab, showTabs }) => {
  const { user } = useAuth();

  const tabs = [
    { id: 'trips', label: 'My Trips' },
    { id: 'vehicle', label: 'My Vehicle' },
    { id: 'history', label: 'Ride History' },
    { id: 'wallet', label: 'Wallet' },
    { id: 'setting', label: 'Setting' }
  ];

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

      {/* Profile area - Welcome text and profile image */}
      <div className="header-profile-section" onClick={onProfileClick} title={user ? "Edit Profile" : "User Account"}>
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
          {user && user.photo ? (
            <img src={user.photo} alt={user.name} className="header-avatar-img" />
          ) : (
            <User size={22} />
          )}
        </div>
      </div>
    </header>
  );
};
export default Header;
