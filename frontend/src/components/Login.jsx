import React, { useState } from 'react';
import { Mail, Lock, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Header from './Header';
import Sidebar from './Sidebar';

export const Login = ({ onNavigateToSignUp, onNavigateBack }) => {
  const { login, error, setError, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    setError(null);

    if (!email) {
      setValidationError('Please enter your email or mobile number.');
      return;
    }
    if (!password) {
      setValidationError('Please enter your password.');
      return;
    }

    try {
      await login(email, password);
      // Auth success will be detected in App.jsx via auth state changes
    } catch (err) {
      // Handled by context error state
    }
  };

  return (
    <div className="app-container animate-fade-in">
      {/* Header Bar */}
      <Header showTabs={false} />

      {/* Main Body */}
      <div className="app-body-wrapper">
        {/* Sidebar */}
        <Sidebar label="Login" />

        {/* Content Area */}
        <main className="app-content-area">
          <div className="auth-card">
            {/* Back header */}
            <button className="back-header" onClick={onNavigateBack}>
              <ArrowLeft size={16} />
              <span>Login To Continue</span>
            </button>

            {/* Error Message display */}
            {(validationError || error) && (
              <div className="feedback-alert feedback-error" style={{ marginBottom: '20px' }}>
                {validationError || error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="auth-form">
              {/* Email Field */}
              <div className="form-group">
                <label className="form-label">Email / Mobile</label>
                <div className="input-icon-wrapper">
                  <div className="input-icon-left">
                    <Mail size={18} />
                  </div>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Enter your email or mobile"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-icon-wrapper">
                  <div className="input-icon-left">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Logging in...</span>
                  </>
                ) : (
                  <span>Login</span>
                )}
              </button>

              {/* Divider */}
              <div className="divider">Or</div>

              {/* Sign Up Link */}
              <div className="auth-footer">
                <span className="auth-footer-text">Create New Account</span>
                <button
                  type="button"
                  className="btn-signup-link"
                  onClick={onNavigateToSignUp}
                  disabled={isLoading}
                >
                  Sign Up
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Login;
