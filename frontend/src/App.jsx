import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { setupMockApi } from './utils/mockApi';
import Splash from './components/Splash';
import Login from './components/Login';
import SignUp from './components/SignUp';
import Dashboard from './components/Dashboard';
import ProfileModal from './components/ProfileModal';

// Initialize the mock API interceptor to catch POST /api/auth/login, etc.
setupMockApi();

function MainAppContent() {
  const { user } = useAuth();
  const [screen, setScreen] = useState('splash');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Automatically transition to the dashboard once authenticated.
  // Automatically redirect back to the login screen if the user logs out.
  useEffect(() => {
    if (user) {
      setScreen('dashboard');
    } else if (screen === 'dashboard') {
      setScreen('login');
    }
  }, [user, screen]);

  const handleSplashFinish = () => {
    if (user) {
      setScreen('dashboard');
    } else {
      setScreen('login');
    }
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
          <Dashboard onProfileClick={() => setIsProfileOpen(true)} />
          
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
