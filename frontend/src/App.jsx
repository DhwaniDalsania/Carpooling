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

function MainAppContent() {
  const { user } = useAuth();
  const [screen, setScreen] = useState('splash');
  const [routeState, setRouteState] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Automatically transition to the dashboard once authenticated.
  // Automatically redirect back to the login screen if the user logs out.
  useEffect(() => {
    if (user) {
      // Avoid resetting search/available-rides screens on user change if already in active flow
      if (screen !== 'route-confirmation' && screen !== 'available-rides') {
        setScreen('dashboard');
      }
    } else if (screen === 'dashboard' || screen === 'route-confirmation' || screen === 'available-rides') {
      setScreen('login');
      setRouteState(null);
    }
  }, [user, screen]);

  const handleSplashFinish = () => {
    if (user) {
      setScreen('dashboard');
    } else {
      setScreen('login');
    }
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
