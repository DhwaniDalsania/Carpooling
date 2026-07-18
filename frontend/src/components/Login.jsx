import React, { useState } from 'react';
import { Mail, Lock, ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Header from './Header';
import Sidebar from './Sidebar';

export const Login = ({ onNavigateToSignUp, onNavigateBack }) => {
  const { login, error, setError, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    } catch (err) {
      // Handled by context error state
    }
  };

  // Safely coerce error to a string
  const displayError = validationError || (typeof error === 'string' ? error : error?.message);

  return (
    <div className="app-container animate-fade-in">
      <Header showTabs={false} />

      <div className="app-body-wrapper">
        <Sidebar label="Login" />

        <main className="app-content-area">
          <div className="auth-card">
            <button className="back-header" onClick={onNavigateBack}>
              <ArrowLeft size={16} />
              <span>Login To Continue</span>
            </button>

            {displayError && (
              <div className="feedback-alert feedback-error" style={{ marginBottom: '20px' }}>
                {displayError}
              </div>
            )}

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

              {/* Password Field with eye toggle */}
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-icon-wrapper" style={{ position: 'relative' }}>
                  <div className="input-icon-left">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input-field"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    style={{ paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={isLoading}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ marginTop: '10px' }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Logging in...</span>
                  </>
                ) : (
                  <span>Login</span>
                )}
              </button>

              <div className="divider">Or</div>

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
