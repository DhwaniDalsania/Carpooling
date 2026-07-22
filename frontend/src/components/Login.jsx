import React, { useState } from 'react';
import { Mail, Lock, ArrowLeft, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Header from './Header';

export const Login = ({ onNavigateToSignUp, onNavigateBack }) => {
  const { login, error, setError, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Real-time Validation States
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [validationError, setValidationError] = useState('');

  const validateEmail = (val) => {
    if (!val) {
      setEmailError('Email or mobile number is required.');
      return false;
    }
    
    // Check if user is typing email
    if (val.includes('@')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val.trim())) {
        setEmailError('Please enter a valid email address.');
        return false;
      }
    } else {
      // Mobile validation: digits only, must be 10 to 12 digits
      const digits = val.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 12) {
        setEmailError('Please enter a valid 10-12 digit mobile number.');
        return false;
      }
    }
    
    setEmailError('');
    return true;
  };

  const validatePassword = (val) => {
    if (!val) {
      setPasswordError('Password is required.');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    validateEmail(val);
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    validatePassword(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    setError(null);

    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      setValidationError('Please fix the errors in the form.');
      return;
    }

    try {
      await login(email.trim(), password);
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
        <main className="app-content-area">
          <div className="app-content-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
            
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
                      className="input-field text-body"
                      placeholder="Enter your email or mobile"
                      value={email}
                      onChange={handleEmailChange}
                      disabled={isLoading}
                    />
                  </div>
                  {emailError && (
                    <div className="inline-error-msg">
                      <AlertCircle size={12} />
                      <span>{emailError}</span>
                    </div>
                  )}
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
                      className="input-field text-body"
                      placeholder="Enter your password"
                      value={password}
                      onChange={handlePasswordChange}
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
                  {passwordError && (
                    <div className="inline-error-msg">
                      <AlertCircle size={12} />
                      <span>{passwordError}</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ marginTop: '10px' }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} style={{ marginRight: '8px' }} />
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

          </div>
        </main>
      </div>
    </div>
  );
};

export default Login;
