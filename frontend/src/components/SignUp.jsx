import React, { useState, useRef } from 'react';
import { User, Phone, Mail, Lock, Building, ArrowLeft, Upload, Loader2, Check, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Header from './Header';

export const SignUp = ({ onNavigateToLogin, onNavigateBack }) => {
  const { register, error, setError, isLoading } = useAuth();
  
  // Form States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [orgCode, setOrgCode] = useState('');
  const [photoBase64, setPhotoBase64] = useState('');
  
  // UI feedback states
  const [validationError, setValidationError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Real-time validation error states
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [orgCodeError, setOrgCodeError] = useState('');
  
  const fileInputRef = useRef(null);

  // Individual validators
  const validateName = (val) => {
    if (!val.trim()) {
      setNameError('Full name is required.');
      return false;
    }
    if (val.trim().length < 3) {
      setNameError('Name must be at least 3 characters.');
      return false;
    }
    setNameError('');
    return true;
  };

  const validatePhone = (val) => {
    if (!val.trim()) {
      setPhoneError('Phone number is required.');
      return false;
    }
    const phoneRegex = /^\+?\d{10,12}$/;
    if (!phoneRegex.test(val.trim())) {
      setPhoneError('Enter a valid 10-12 digit mobile number.');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const validateEmail = (val) => {
    if (!val.trim()) {
      setEmailError('Email address is required.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val.trim())) {
      setEmailError('Please enter a valid email address.');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (val) => {
    if (!val) {
      setPasswordError('Password is required.');
      return false;
    }
    if (val.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const validateConfirmPassword = (val, originalPassword = password) => {
    if (!val) {
      setConfirmPasswordError('Please confirm your password.');
      return false;
    }
    if (val !== originalPassword) {
      setConfirmPasswordError('Passwords do not match.');
      return false;
    }
    setConfirmPasswordError('');
    return true;
  };

  const validateOrgCode = (val) => {
    if (!val.trim()) {
      setOrgCodeError('Organization invite code is required.');
      return false;
    }
    setOrgCodeError('');
    return true;
  };

  // Change Handlers with real-time validation triggers
  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    validateName(val);
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value;
    setPhone(val);
    validatePhone(val);
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
    if (confirmPassword) {
      validateConfirmPassword(confirmPassword, val);
    }
  };

  const handleConfirmPasswordChange = (e) => {
    const val = e.target.value;
    setConfirmPassword(val);
    validateConfirmPassword(val);
  };

  const handleOrgCodeChange = (e) => {
    const val = e.target.value;
    setOrgCode(val);
    validateOrgCode(val);
  };

  // Handle Photo Upload and Base64 conversion
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setValidationError('Image size must be less than 2MB.');
        return;
      }
      setValidationError('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoBase64(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    setSuccessMessage('');
    setError(null);

    // Form Validations
    const isNameValid = validateName(name);
    const isPhoneValid = validatePhone(phone);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isConfirmValid = validateConfirmPassword(confirmPassword);
    const isOrgValid = validateOrgCode(orgCode);

    if (!isNameValid || !isPhoneValid || !isEmailValid || !isPasswordValid || !isConfirmValid || !isOrgValid) {
      setValidationError('Please resolve all validation errors in the form.');
      return;
    }

    try {
      const msg = await register(name.trim(), email.trim(), password, orgCode.trim(), phone.trim(), photoBase64);
      setSuccessMessage(msg || 'Registration successful! Redirecting to Login...');
      
      // Auto-redirect to login after 1.5s
      setTimeout(() => {
        onNavigateToLogin();
      }, 1500);
    } catch (err) {
      // Error is caught by context
    }
  };

  return (
    <div className="app-container animate-fade-in">
      {/* Header Bar */}
      <Header showTabs={false} />

      {/* Main Body */}
      <div className="app-body-wrapper">
        {/* Content Area */}
        <main className="app-content-area">
          <div className="app-content-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
            
            <div className="auth-card" style={{ maxWidth: '780px' }}>
              {/* Back header */}
              <button className="back-header" onClick={onNavigateBack}>
                <ArrowLeft size={16} />
                <span>Create Account</span>
              </button>

              {/* Success Alert */}
              {successMessage && (
                <div className="feedback-alert feedback-success" style={{ marginBottom: '20px' }}>
                  <Check size={18} />
                  <span className="text-body" style={{ color: '#34d399' }}>{successMessage}</span>
                </div>
              )}

              {/* Error Alert */}
              {(validationError || error) && (
                <div className="feedback-alert feedback-error" style={{ marginBottom: '20px' }}>
                  <AlertCircle size={18} />
                  <span className="text-body" style={{ color: '#f87171' }}>
                    {validationError || (typeof error === 'string' ? error : error?.message)}
                  </span>
                </div>
              )}

              {/* Multi-column Grid layout */}
              <form onSubmit={handleSubmit} className="auth-form">
                <div className="signup-layout-grid">
                  
                  {/* Left/Center Form Fields */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Name field */}
                    <div className="form-group">
                      <label className="form-label">Name</label>
                      <div className="input-icon-wrapper">
                        <div className="input-icon-left">
                          <User size={18} />
                        </div>
                        <input
                          type="text"
                          className="input-field text-body"
                          placeholder="Enter your name"
                          value={name}
                          onChange={handleNameChange}
                          disabled={isLoading || successMessage}
                        />
                      </div>
                      {nameError && (
                        <div className="inline-error-msg">
                          <AlertCircle size={12} />
                          <span>{nameError}</span>
                        </div>
                      )}
                    </div>

                    {/* Phone field */}
                    <div className="form-group">
                      <label className="form-label">Phone</label>
                      <div className="input-icon-wrapper">
                        <div className="input-icon-left">
                          <Phone size={18} />
                        </div>
                        <input
                          type="tel"
                          className="input-field text-body"
                          placeholder="Enter your mobile number"
                          value={phone}
                          onChange={handlePhoneChange}
                          disabled={isLoading || successMessage}
                        />
                      </div>
                      {phoneError && (
                        <div className="inline-error-msg">
                          <AlertCircle size={12} />
                          <span>{phoneError}</span>
                        </div>
                      )}
                    </div>

                    {/* Email field */}
                    <div className="form-group">
                      <label className="form-label">Email Address</label>
                      <div className="input-icon-wrapper">
                        <div className="input-icon-left">
                          <Mail size={18} />
                        </div>
                        <input
                          type="email"
                          className="input-field text-body"
                          placeholder="Enter your email address"
                          value={email}
                          onChange={handleEmailChange}
                          disabled={isLoading || successMessage}
                        />
                      </div>
                      {emailError && (
                        <div className="inline-error-msg">
                          <AlertCircle size={12} />
                          <span>{emailError}</span>
                        </div>
                      )}
                    </div>

                    {/* Organization Invite Code field */}
                    <div className="form-group">
                      <label className="form-label">Organization Invite Code</label>
                      <div className="input-icon-wrapper">
                        <div className="input-icon-left">
                          <Building size={18} />
                        </div>
                        <input
                          type="text"
                          className="input-field text-body"
                          placeholder="Enter your organization invite code"
                          value={orgCode}
                          onChange={handleOrgCodeChange}
                          disabled={isLoading || successMessage}
                        />
                      </div>
                      {orgCodeError && (
                        <div className="inline-error-msg">
                          <AlertCircle size={12} />
                          <span>{orgCodeError}</span>
                        </div>
                      )}
                    </div>

                    {/* Password field with eye toggle */}
                    <div className="form-group">
                      <label className="form-label">Password</label>
                      <div className="input-icon-wrapper" style={{ position: 'relative' }}>
                        <div className="input-icon-left">
                          <Lock size={18} />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className="input-field text-body"
                          placeholder="Enter password"
                          value={password}
                          onChange={handlePasswordChange}
                          disabled={isLoading || successMessage}
                          style={{ paddingRight: '44px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          disabled={isLoading}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:'4px', display:'flex', alignItems:'center' }}
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

                    {/* Confirm Password field with eye toggle */}
                    <div className="form-group">
                      <label className="form-label">Confirm Password</label>
                      <div className="input-icon-wrapper" style={{ position: 'relative' }}>
                        <div className="input-icon-left">
                          <Lock size={18} />
                        </div>
                        <input
                          type={showConfirm ? 'text' : 'password'}
                          className="input-field text-body"
                          placeholder="Confirm your password"
                          value={confirmPassword}
                          onChange={handleConfirmPasswordChange}
                          disabled={isLoading || successMessage}
                          style={{ paddingRight: '44px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm((v) => !v)}
                          disabled={isLoading}
                          aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                          style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:'4px', display:'flex', alignItems:'center' }}
                        >
                          {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {confirmPasswordError && (
                        <div className="inline-error-msg">
                          <AlertCircle size={12} />
                          <span>{confirmPasswordError}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right side Photo Upload Area */}
                  <div className="upload-zone-wrapper">
                    <span className="form-label" style={{ marginBottom: '12px' }}>Profile Photo</span>
                    
                    <div 
                      className={`profile-upload-circle ${photoBase64 ? 'has-image' : ''}`} 
                      onClick={triggerFileInput}
                      title="Upload profile picture"
                    >
                      {photoBase64 ? (
                        <>
                          <img src={photoBase64} alt="Preview" className="upload-preview-img" />
                          <div className="upload-overlay">
                            <Upload size={18} style={{ marginBottom: '4px' }} />
                            <span>Change</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <Upload className="upload-icon" size={28} />
                          <span className="upload-label">Upload</span>
                        </>
                      )}
                    </div>
                    
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="upload-hidden-input"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      disabled={isLoading || successMessage}
                    />
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
                      JPG or PNG. Max 2MB.
                    </p>
                  </div>

                </div>

                {/* Submit Button */}
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ marginTop: '24px', width: '100%' }} 
                  disabled={isLoading || successMessage}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} style={{ marginRight: '8px' }} />
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <span>Sign Up</span>
                  )}
                </button>

                {/* Login redirection link */}
                <div className="auth-footer" style={{ marginTop: '16px' }}>
                  <span className="auth-footer-text">Already have an account?</span>
                  <button
                    type="button"
                    className="btn-signup-link"
                    onClick={onNavigateToLogin}
                    disabled={isLoading || successMessage}
                  >
                    Login
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

export default SignUp;
