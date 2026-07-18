import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

// Helper to safely parse API responses, log body/status, and handle empty payloads (Requirements 7, 8, 9)
async function parseJsonResponse(response) {
  const text = await response.text();
  
  // Log request URL, status code, and raw body to console to identify issues easily
  console.log(`[API Response] URL: ${response.url} | Status: ${response.status} | Content-Type: ${response.headers.get('content-type')}`);
  console.log(`[API Response Body]`, text ? (text.length > 500 ? text.substring(0, 500) + '...' : text) : '<empty>');

  if (!text.trim()) {
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: Server returned an empty response.`);
    }
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    if (!response.ok) {
      // If server failed, throw the raw message or fall back to status text
      throw new Error(text || `HTTP Error ${response.status}`);
    }
    throw new Error('Failed to parse server response as valid JSON.');
  }
}

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await parseJsonResponse(response);
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name, email, password, organizationCode, phone, photo) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, organizationCode, phone, photo })
      });
      
      const data = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      return data.message;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (name, photo) => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ email: user.email, name, photo })
      });
      
      const data = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.message || 'Profile update failed');
      }

      setUser(data.user);
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        error,
        isLoading,
        login,
        register,
        updateProfile,
        logout,
        setError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
export default AuthProvider;
