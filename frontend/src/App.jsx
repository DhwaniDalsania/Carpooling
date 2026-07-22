import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Splash from './components/Splash';
import Login from './components/Login';
import SignUp from './components/SignUp';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import ProfileModal from './components/ProfileModal';
import RouteConfirmation from './components/RouteConfirmation';
import AvailableRides from './components/AvailableRides';
import TrackRide from './components/TrackRide';
import { WifiOff, ShieldAlert } from 'lucide-react';

// Custom lightweight URL route parser
function parseLocation(path = window.location.pathname) {
  const cleanPath = path.replace(/\/$/, '') || '/'; // remove trailing slash

  if (cleanPath === '/' || cleanPath === '/splash') {
    return { screen: 'splash', tab: 'dashboard' };
  }
  if (cleanPath === '/login') {
    return { screen: 'login', tab: 'dashboard' };
  }
  if (cleanPath === '/signup') {
    return { screen: 'signup', tab: 'dashboard' };
  }
  if (cleanPath === '/route-confirmation') {
    return { screen: 'route-confirmation', tab: 'dashboard' };
  }
  if (cleanPath === '/available-rides') {
    return { screen: 'available-rides', tab: 'dashboard' };
  }
  if (cleanPath === '/track-ride') {
    return { screen: 'track-ride', tab: 'dashboard' };
  }

  // Dashboard sub-routes (tabs)
  const tabs = ['dashboard', 'trips', 'vehicle', 'history', 'wallet', 'setting', 'report', 'saved-places', 'help', 'chat'];
  const tabMatch = cleanPath.substring(1); // e.g. "wallet"
  if (tabs.includes(tabMatch)) {
    return { screen: 'dashboard', tab: tabMatch };
  }

  // Unknown route
  return { screen: '404', tab: 'dashboard' };
}

// Map screen and tab back to clean path
function getPathForScreen(screen, stateData) {
  if (screen === 'splash') return '/';
  if (screen === 'login') return '/login';
  if (screen === 'signup') return '/signup';
  if (screen === 'route-confirmation') return '/route-confirmation';
  if (screen === 'available-rides') return '/available-rides';
  if (screen === 'track-ride') {
    const tripId = stateData?.tripId;
    return tripId ? `/track-ride?tripId=${tripId}` : '/track-ride';
  }
  if (screen === 'dashboard') {
    const tab = stateData?.activeTab || 'dashboard';
    return `/${tab}`;
  }
  return '/dashboard';
}

const Footer = ({ onNavigate }) => {
  return (
    <footer style={{
      borderTop: '1px solid var(--border-default)',
      padding: '24px',
      marginTop: 'auto',
      backgroundColor: 'var(--bg-card)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '16px',
      fontSize: '12px',
      color: 'var(--text-label)',
      zIndex: 10
    }}>
      <div>
        © 2026 FindMeARide. Built for Acme Technologies.
      </div>
      <div style={{ display: 'flex', gap: '24px' }}>
        <a 
          href="#help" 
          onClick={(e) => { e.preventDefault(); onNavigate('dashboard', { activeTab: 'help' }); }} 
          style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'inherit'}
        >
          Help & Support
        </a>
        <a href="#privacy" onClick={(e) => e.preventDefault()} style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</a>
        <a href="#terms" onClick={(e) => e.preventDefault()} style={{ color: 'inherit', textDecoration: 'none' }}>Terms of Service</a>
      </div>
    </footer>
  );
};

const NotFoundPage = ({ onGoHome }) => {
  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center', alignItems: 'center' }}>
      <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center', gap: '16px' }}>
        <ShieldAlert size={64} style={{ color: '#ef4444' }} />
        <h1 className="text-page-title" style={{ fontSize: '48px', margin: 0 }}>404</h1>
        <h2 className="text-card-title" style={{ fontSize: '20px', margin: 0 }}>Route Not Found</h2>
        <p className="text-body" style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: 0 }}>
          The page you are looking for doesn't exist. Let's get you back on track.
        </p>
        <button className="btn btn-primary" onClick={onGoHome} style={{ height: '40px', padding: '0 24px', marginTop: '8px' }}>
          Back to Dashboard
        </button>
      </main>
    </div>
  );
};

function MainAppContent() {
  const { user, isInitializing } = useAuth();
  
  // Custom router state
  const [routeInfo, setRouteInfo] = useState(() => parseLocation());
  const [routeState, setRouteState] = useState(null);
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [splashFinished, setSplashFinished] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Sync browser back/forward popstate
  useEffect(() => {
    const handlePopState = () => {
      setRouteInfo(parseLocation());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Monitor network online/offline triggers
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync browser window title dynamically
  useEffect(() => {
    let title = 'FindMeARide';
    const screen = routeInfo.screen;

    if (screen === 'splash') title = 'Welcome — FindMeARide';
    else if (screen === 'login') title = 'Sign In — FindMeARide';
    else if (screen === 'signup') title = 'Sign Up — FindMeARide';
    else if (screen === 'route-confirmation') title = 'Confirm Route — FindMeARide';
    else if (screen === 'available-rides') title = 'Available Rides — FindMeARide';
    else if (screen === 'track-ride') title = 'Track Ride — FindMeARide';
    else if (screen === '404') title = 'Page Not Found — FindMeARide';
    else if (screen === 'dashboard') {
      const formattedTab = routeInfo.tab.charAt(0).toUpperCase() + routeInfo.tab.slice(1);
      title = `${formattedTab} — FindMeARide`;
    }
    document.title = title;
  }, [routeInfo]);

  // Handle Auth redirects and initial route loading
  useEffect(() => {
    if (isInitializing) return;

    const path = window.location.pathname;
    const { screen: cleanScreen } = parseLocation(path);

    if (splashFinished) {
      if (!user) {
        if (cleanScreen !== 'login' && cleanScreen !== 'signup') {
          window.history.replaceState(null, '', `/login?redirect=${encodeURIComponent(path)}`);
          setRouteInfo(parseLocation('/login'));
        }
      } else {
        if (cleanScreen === 'login' || cleanScreen === 'signup' || cleanScreen === 'splash' || path === '/') {
          const params = new URLSearchParams(window.location.search);
          const redirectPath = params.get('redirect') || '/dashboard';
          window.history.replaceState(null, '', redirectPath);
          setRouteInfo(parseLocation(redirectPath));
        }
      }
    }
  }, [user, isInitializing, splashFinished]);

  const handleSplashFinish = () => {
    setSplashFinished(true);
  };

  const handleNavigate = (targetScreen, stateData) => {
    const path = getPathForScreen(targetScreen, stateData);
    
    // Trigger transition progress bar
    setIsTransitioning(true);
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);

    window.history.pushState(null, '', path);
    setRouteState(stateData);
    setRouteInfo(parseLocation(path));
  };

  // Determine current screen to display
  const renderActiveScreen = () => {
    if (isInitializing || !splashFinished) {
      return <Splash onFinish={handleSplashFinish} isInitializing={isInitializing} />;
    }

    const { screen: currentScreen } = routeInfo;

    // Route guards
    if (!user && currentScreen !== 'login' && currentScreen !== 'signup') {
      return <Login onNavigateToSignUp={() => handleNavigate('signup')} onNavigateBack={() => handleNavigate('splash')} />;
    }

    switch (currentScreen) {
      case 'login':
        return <Login onNavigateToSignUp={() => handleNavigate('signup')} onNavigateBack={() => handleNavigate('splash')} />;

      case 'signup':
        return <SignUp onNavigateToLogin={() => handleNavigate('login')} onNavigateBack={() => handleNavigate('login')} />;

      case 'dashboard':
        if (user?.role === 'admin') {
          return <AdminDashboard onProfileClick={() => setIsProfileOpen(true)} />;
        }
        return (
          <>
            <Dashboard 
              onProfileClick={() => setIsProfileOpen(true)} 
              onNavigate={handleNavigate}
              dashboardState={{ ...routeState, activeTab: routeInfo.tab }}
            />
            <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
          </>
        );

      case 'route-confirmation':
        return (
          <>
            <RouteConfirmation
              routeState={routeState}
              onBack={() => handleNavigate('dashboard')}
              onProfileClick={() => setIsProfileOpen(true)}
              onNavigate={handleNavigate}
            />
            <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
          </>
        );

      case 'available-rides':
        return (
          <>
            <AvailableRides
              routeState={routeState}
              onBack={() => handleNavigate('route-confirmation')}
              onProfileClick={() => setIsProfileOpen(true)}
              onNavigate={handleNavigate}
            />
            <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
          </>
        );

      case 'track-ride':
        return (
          <>
            <TrackRide
              routeState={routeState}
              onBack={() => handleNavigate('dashboard', { activeTab: 'trips' })}
              onProfileClick={() => setIsProfileOpen(true)}
              onNavigate={handleNavigate}
            />
            <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
          </>
        );

      case '404':
      default:
        return <NotFoundPage onGoHome={() => handleNavigate('dashboard')} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}>
      
      {/* Route Transition Top Loading Bar */}
      {isTransitioning && <div className="route-loading-bar" />}
      
      {/* Dynamic Screen viewport */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {renderActiveScreen()}
      </div>

      {/* Lightweight Utility Footer */}
      {splashFinished && !isInitializing && routeInfo.screen !== 'splash' && (
        <Footer onNavigate={handleNavigate} />
      )}

      {/* Connection State Warning toast */}
      {isOffline && (
        <div className="offline-toast">
          <WifiOff size={14} />
          <span>Connection lost. Working offline...</span>
        </div>
      )}

    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}

export default App;
