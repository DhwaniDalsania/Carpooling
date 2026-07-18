import React, { useState, useRef } from 'react';
import { X, Camera, User, Mail, Building, Loader2, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ProfileModal = ({ isOpen, onClose }) => {
  const { user, updateProfile, isLoading, error, setError } = useAuth();
  
  const [name, setName] = useState(user?.name || '');
  const [photoBase64, setPhotoBase64] = useState(user?.photo || '');
  const [success, setSuccess] = useState('');
  const [validationError, setValidationError] = useState('');
  
  const fileInputRef = useRef(null);

  if (!isOpen || !user) return null;

  // Handle Photo change and convert to base64
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

  const handleSave = async (e) => {
    e.preventDefault();
    setSuccess('');
    setValidationError('');
    setError(null);

    if (!name.trim()) {
      setValidationError('Name cannot be empty.');
      return;
    }

    try {
      await updateProfile(name, photoBase64);
      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 1000);
    } catch (err) {
      // Caught by context error
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-fade-in">
        {/* Modal Header */}
        <div className="modal-header">
          <span className="modal-title">My Profile</span>
          <button className="modal-close-btn" onClick={onClose} disabled={isLoading}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave}>
          <div className="modal-body">
            
            {/* Profile Avatar Upload Section */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
              <div 
                className="profile-upload-circle has-image" 
                style={{ width: '100px', height: '100px' }}
                onClick={triggerFileInput}
                title="Change profile picture"
              >
                {photoBase64 ? (
                  <img src={photoBase64} alt="Avatar" className="upload-preview-img" />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-muted)' }}>
                    <User size={32} />
                  </div>
                )}
                <div className="upload-overlay" style={{ opacity: photoBase64 ? 0 : 1 }}>
                  <Camera size={16} style={{ marginBottom: '2px' }} />
                  <span style={{ fontSize: '10px' }}>Change</span>
                </div>
              </div>
              
              <input
                type="file"
                ref={fileInputRef}
                className="upload-hidden-input"
                accept="image/*"
                onChange={handlePhotoChange}
                disabled={isLoading}
              />
            </div>

            {/* Success Alert */}
            {success && (
              <div className="feedback-alert feedback-success">
                <Check size={16} />
                <span>{success}</span>
              </div>
            )}

            {/* Error Alert */}
            {(validationError || error) && (
              <div className="feedback-alert feedback-error">
                <span>{validationError || error}</span>
              </div>
            )}

            {/* Fields */}
            {/* Name */}
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div className="input-icon-wrapper">
                <div className="input-icon-left">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Email (Readonly) */}
            <div className="form-group">
              <label className="form-label">Email Address (Read-only)</label>
              <div className="input-icon-wrapper">
                <div className="input-icon-left" style={{ opacity: 0.5 }}>
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  className="input-field"
                  value={user.email}
                  disabled={true}
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                />
              </div>
            </div>

            {/* Organization (Readonly) */}
            <div className="form-group">
              <label className="form-label">Organization Code (Read-only)</label>
              <div className="input-icon-wrapper">
                <div className="input-icon-left" style={{ opacity: 0.5 }}>
                  <Building size={18} />
                </div>
                <input
                  type="text"
                  className="input-field"
                  value={user.organizationCode || 'N/A'}
                  disabled={true}
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                />
              </div>
            </div>

          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ height: '44px', padding: '0 20px', fontSize: '14px' }} 
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ height: '44px', padding: '0 24px', fontSize: '14px' }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
