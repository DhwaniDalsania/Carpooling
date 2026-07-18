import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
// Mock API disabled — real Express backend handles /api/* (via Vite proxy)
// import { setupMockApi } from './utils/mockApi';
import Splash from './components/Splash';
import Login from './components/Login';
import SignUp from './components/SignUp';
import Dashboard from './components/Dashboard';
import ProfileModal from './components/ProfileModal';
import RouteConfirmation from './components/RouteConfirmation';
import AvailableRides from './components/AvailableRides';
import TrackRide from './components/TrackRide';

function MainAppContent() {
  const { user, isInitializing } = useAuth();
  const [screen, setScreen] = useState('splash');
  const [routeState, setRouteState] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [splashFinished, setSplashFinished] = useState(false);

  // Transition screen when both the splash animation finishes and token validation resolves
  useEffect(() => {
    if (isInitializing) return;

    if (splashFinished) {
      setScreen(user ? 'dashboard' : 'login');
    }
  }, [isInitializing, splashFinished, user]);

  // Redirect to login if user becomes unauthenticated (e.g. logs out) while on authenticated screens
  useEffect(() => {
    if (!isInitializing && !user && (screen === 'dashboard' || screen === 'route-confirmation' || screen === 'available-rides' || screen === 'track-ride')) {
      setScreen('login');
      setRouteState(null);
    }
  }, [user, isInitializing, screen]);

  const handleSplashFinish = () => {
    setSplashFinished(true);
  };

  const handleNavigate = (targetScreen, stateData) => {
    setRouteState(stateData);
    setScreen(targetScreen);
  };

  switch (screen) {
    case 'splash':
      return <Splash onFinish={handleSplashFinish} />;
    
    case 'login':
      return (
        <Login
          onNavigateToSignUp={() => setScreen('signup')}
          onNavigateBack={() => setScreen('splash')}
        />
      );
      
    case 'signup':
      return (
        <SignUp
          onNavigateToLogin={() => setScreen('login')}
          onNavigateBack={() => setScreen('login')}
        />
      );
      
    case 'dashboard':
      return (
        <>
          <Dashboard 
            onProfileClick={() => setIsProfileOpen(true)} 
            onNavigate={handleNavigate}
            dashboardState={routeState}
          />
          
          <ProfileModal 
            isOpen={isProfileOpen} 
            onClose={() => setIsProfileOpen(false)} 
          />
        </>
      );

    case 'route-confirmation':
      return (
        <>
          <RouteConfirmation
            routeState={routeState}
            onBack={() => setScreen('dashboard')}
            onProfileClick={() => setIsProfileOpen(true)}
            onNavigate={handleNavigate}
          />

          <ProfileModal
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
          />
        </>
      );

    case 'available-rides':
      return (
        <>
          <AvailableRides
            routeState={routeState}
            onBack={() => setScreen('route-confirmation')}
            onProfileClick={() => setIsProfileOpen(true)}
            onNavigate={handleNavigate}
          />

          <ProfileModal
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
          />
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

          <ProfileModal
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
          />
        </>
      );
      
    default:
      return <Splash onFinish={handleSplashFinish} />;
  }
}

export function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}

export default App;
