import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Trash2, Edit2, Loader2, Check, RefreshCw } from 'lucide-react';

export const SavedPlaces = ({ onBack, token }) => {
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const fetchSavedPlaces = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/saved-places', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to retrieve saved places.');
      const data = await res.json();
      setSavedPlaces(data);
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred fetching saved places.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchSavedPlaces();
    }
  }, [token]);

  // Geocode address via Nominatim
  const handleGeocode = async () => {
    if (!address.trim()) {
      alert('Please enter an address to search.');
      return;
    }
    setIsGeocoding(true);
    setErrorMsg('');
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address.trim())}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'EnterpriseCarpoolingHackathon/1.0 (dhwanidalsania@example.com)' }
      });
      if (!res.ok) throw new Error('Failed to geocode address.');
      const data = await res.json();
      if (!data || data.length === 0) {
        throw new Error('Address location not found. Please try a more specific address.');
      }
      setLat(parseFloat(data[0].lat).toFixed(6));
      setLng(parseFloat(data[0].lon).toFixed(6));
      setSuccessMsg('Coordinates resolved successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Error resolving address location.');
    } finally {
      setIsGeocoding(false);
    }
  };

  // Create or Update place
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!label.trim() || !address.trim() || !lat || !lng) {
      setErrorMsg('Please fill all fields and resolve coordinates.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        label: label.trim(),
        address: address.trim(),
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      };

      let res;
      if (editingId) {
        // Update
        res = await fetch(`/api/saved-places/${editingId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        // Create
        res = await fetch('/api/saved-places', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save place.');

      setSuccessMsg(editingId ? 'Saved place updated!' : 'Saved place added!');
      setLabel('');
      setAddress('');
      setLat('');
      setLng('');
      setEditingId(null);
      await fetchSavedPlaces();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save place.');
    } finally {
      setLoading(false);
    }
  };

  // Delete place
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this place?')) return;
    try {
      const res = await fetch(`/api/saved-places/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete saved place.');
      setSavedPlaces(prev => prev.filter(p => p.id !== id));
      setSuccessMsg('Place deleted successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete saved place.');
    }
  };

  // Trigger edit mode
  const startEdit = (place) => {
    setEditingId(place.id);
    setLabel(place.label);
    setAddress(place.address);
    setLat(place.lat.toString());
    setLng(place.lng.toString());
    setErrorMsg('');
    setSuccessMsg('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setLabel('');
    setAddress('');
    setLat('');
    setLng('');
    setErrorMsg('');
  };

  const PlaceSkeleton = () => (
    <div style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-input)', padding: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
      <div className="shimmer-bg" style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0 }}></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        <div className="shimmer-bg" style={{ width: '40%', height: '12px', borderRadius: '4px' }}></div>
        <div className="shimmer-bg" style={{ width: '80%', height: '10px', borderRadius: '4px' }}></div>
      </div>
    </div>
  );

  return (
    <div className="dashboard-container animate-fade-in" style={{ maxWidth: '1000px', padding: '24px' }}>
      <style>{`
        .saved-places-grid {
          display: grid;
          grid-template-columns: 1fr 1.3fr;
          gap: 32px;
          align-items: start;
          margin-top: 16px;
        }
        @media (max-width: 768px) {
          .saved-places-grid {
            grid-template-columns: 1fr;
            gap: 24px;
          }
        }
      `}</style>
      
      <button className="back-header" onClick={onBack} style={{ marginBottom: '16px' }}>
        <ArrowLeft size={16} />
        <span className="text-page-title">Saved Places</span>
      </button>

      {successMsg && (
        <div className="feedback-alert feedback-success" style={{ padding: '16px', marginBottom: '16px' }}>
          <Check size={16} />
          <span className="text-body" style={{ color: '#34d399' }}>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="feedback-alert feedback-error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', marginBottom: '16px' }}>
          <span className="text-body" style={{ color: '#f87171' }}>{errorMsg}</span>
          <button className="btn-retry" onClick={fetchSavedPlaces}>
            <RefreshCw size={12} />
            <span>Retry</span>
          </button>
        </div>
      )}

      <div className="saved-places-grid">
        
        {/* Left Side: Form */}
        <div style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '12px', padding: '24px' }}>
          <h3 className="text-card-title" style={{ marginTop: 0, marginBottom: '16px' }}>
            {editingId ? 'Edit Saved Place' : 'Add New Saved Place'}
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div className="form-group">
              <label className="form-label">Place Label</label>
              <input
                type="text"
                className="input-field text-body"
                placeholder="e.g. Home, Work, Gym"
                value={label}
                onChange={e => setLabel(e.target.value)}
                required
                style={{ paddingLeft: '16px' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Full Address</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="input-field text-body"
                  placeholder="Street, City, State"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  required
                  style={{ paddingLeft: '16px', flex: 1 }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ height: '44px', padding: '0 16px', fontSize: '12px', fontWeight: '600', flexShrink: 0, borderRadius: '8px' }}
                  onClick={handleGeocode}
                  disabled={isGeocoding || !address.trim()}
                >
                  {isGeocoding ? <Loader2 className="animate-spin" size={14} /> : 'Resolve GPS'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  className="input-field text-body"
                  placeholder="e.g. 23.0225"
                  value={lat}
                  onChange={e => setLat(e.target.value)}
                  required
                  style={{ paddingLeft: '16px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  className="input-field text-body"
                  placeholder="e.g. 72.5714"
                  value={lng}
                  onChange={e => setLng(e.target.value)}
                  required
                  style={{ paddingLeft: '16px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1, height: '44px', fontSize: '13px', fontWeight: '700' }}
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : editingId ? 'Update Place' : 'Add Place'}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ height: '44px', padding: '0 16px', fontSize: '13px', borderRadius: '8px' }}
                  onClick={cancelEdit}
                >
                  Cancel
                </button>
              )}
            </div>

          </form>
        </div>

        {/* Right Side: List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 className="text-card-title" style={{ marginTop: 0, marginBottom: '4px' }}>
            Your Saved Places
          </h3>

          {loading && savedPlaces.length === 0 ? (
            <>
              <PlaceSkeleton />
              <PlaceSkeleton />
            </>
          ) : savedPlaces.length === 0 ? (
            <div style={{
              padding: '32px 24px',
              backgroundColor: 'rgba(11, 15, 25, 0.4)',
              border: '1px dashed var(--border-default)',
              borderRadius: '12px',
              textAlign: 'center',
              color: 'var(--text-label)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px'
            }}>
              <MapPin size={32} style={{ color: 'var(--text-label)' }} />
              <div>
                <h4 className="text-card-title" style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>No saved places</h4>
                <p className="text-meta">Save key locations like Home and Work to quickly book or offer rides.</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {savedPlaces.map(place => (
                <div
                  key={place.id}
                  className="saved-place-row"
                  style={{ padding: '16px 24px' }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', overflow: 'hidden', flex: 1 }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(13, 148, 136, 0.1)',
                      color: 'var(--accent-teal)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                      border: '1px solid var(--border-default)'
                    }}>
                      <MapPin size={18} />
                    </div>
                    <div style={{ overflow: 'hidden', flex: 1 }}>
                      <div className="text-card-title" style={{ fontSize: '15px' }}>{place.label}</div>
                      <div className="text-meta" style={{ color: 'var(--text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.address}</div>
                      <div className="text-meta" style={{ fontSize: '11px', marginTop: '4px' }}>
                        Lat: {parseFloat(place.lat).toFixed(5)} • Lng: {parseFloat(place.lng).toFixed(5)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button
                      className="btn btn-secondary"
                      style={{ height: '32px', width: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}
                      onClick={() => startEdit(place)}
                      title="Edit location"
                    >
                      <Edit2 size={13} style={{ color: 'var(--text-secondary)' }} />
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ height: '32px', width: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderColor: 'rgba(239,68,68,0.2)', borderRadius: '8px' }}
                      onClick={() => handleDelete(place.id)}
                      title="Delete location"
                    >
                      <Trash2 size={13} style={{ color: '#ef4444' }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>

    </div>
  );
};

export default SavedPlaces;
