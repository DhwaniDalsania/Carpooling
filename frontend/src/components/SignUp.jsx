import React, { useState, useRef } from 'react';
import { User, Phone, Mail, Lock, Building, ArrowLeft, Upload, Loader2, Check, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Header from './Header';
import Sidebar from './Sidebar';

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
  
  const fileInputRef = useRef(null);

  // Handle Photo Upload and Base64 conversion
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setValidationError('Image size must be less than 2MB.');
        return;
      }
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
    if (!name || !phone || !email || !password || !confirmPassword || !orgCode) {
      setValidationError('All fields are required.');
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters long.');
      return;
    }

    try {
      const msg = await register(name, email, password, orgCode, phone, photoBase64);
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
        {/* Sidebar */}
        <Sidebar label="Sign Up" />

        {/* Content Area */}
        <main className="app-content-area">
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
                {successMessage}
              </div>
            )}

            {/* Error Alert */}
            {(validationError || error) && (
              <div className="feedback-alert feedback-error" style={{ marginBottom: '20px' }}>
                {validationError || (typeof error === 'string' ? error : error?.message)}
              </div>
            )}

            {/* Multi-column Grid layout matching the wireframe */}
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
                        className="input-field"
                        placeholder="Enter your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isLoading || successMessage}
                      />
                    </div>
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
                        className="input-field"
                        placeholder="Enter your mobile number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={isLoading || successMessage}
                      />
                    </div>
                  </div>

                  {/* Email field */}
                  <div className="form-group">
                    <label className="form-label">Email / Mobile</label>
                    <div className="input-icon-wrapper">
                      <div className="input-icon-left">
                        <Mail size={18} />
                      </div>
                      <input
                        type="email"
                        className="input-field"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading || successMessage}
                      />
                    </div>
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
                        className="input-field"
                        placeholder="Enter your organization invite code"
                        value={orgCode}
                        onChange={(e) => setOrgCode(e.target.value)}
                        disabled={isLoading || successMessage}
                      />
                    </div>
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
                        className="input-field"
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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
                        className="input-field"
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
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
                    <Loader2 className="animate-spin" size={18} />
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
        </main>
      </div>
    </div>
  );
};

export default SignUp;
