import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, Check, Loader2, HelpCircle, Mail, Phone, MapPin } from 'lucide-react';

export const Help = ({ onBack }) => {
  const [openFaq, setOpenFaq] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [category, setCategory] = useState('General');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const faqs = [
    { q: 'How do I offer a ride?', a: 'Go to the Dashboard, select "Offer a Ride", fill in your route details, select your registered vehicle and confirm the route. You can also optionally add intermediate stops along your route, which will add a 10% surcharge per stop to the per-seat fare.' },
    { q: 'How does wallet payment work?', a: 'You can add balance to your wallet via the Wallet page using Credit Card or UPI (Razorpay test mode). When a trip is completed, passenger users can pay the fare directly using their wallet balance in one click from the My Trips tab.' },
    { q: 'What are the rules for ride cancellation?', a: 'Passengers can cancel a booked ride only if the ride has not started yet and the departure time is at least 1 hour away. If a passenger cancels, their wallet payment is automatically refunded. Drivers can cancel a booked ride at any time before starting, which automatically cancels all passenger bookings and refunds them.' },
    { q: 'How does live tracking work?', a: 'Once the driver starts the trip, open the trip details from My Trips and click the "Track Ride" or "View Route" button. Both driver and passengers can view the vehicle\'s current position on the map, along with dynamic ETA countdowns.' },
    { q: 'Can I add multiple intermediate stops?', a: 'Yes! When offering a ride, on the Route Confirmation screen you can type intermediate stop addresses. You can add up to 4 stops. Each stop automatically increases the trip\'s per-seat fare by 10%.' },
  ];

  const handleReportIssue = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setErrorMsg('Please fill out all fields.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    // Simulate sending report
    setTimeout(() => {
      setSuccessMsg('Thank you. Your issue has been reported and our support team will contact you shortly.');
      setSubject('');
      setDescription('');
      setSubmitting(false);
    }, 1200);
  };

  return (
    <div className="dashboard-container" style={{ maxWidth: '1000px', gap: '24px' }}>
      
      <button className="back-header" onClick={onBack}>
        <ArrowLeft size={16} />
        <span>Settings</span>
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Help &amp; Support</h2>
      </div>

      {successMsg && (
        <div className="feedback-alert feedback-success">
          <Check size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="feedback-alert feedback-error">
          <span>{errorMsg}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '28px', alignItems: 'start', marginTop: '16px' }}>
        
        {/* Left column: FAQ & Contact Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* FAQ Accordion */}
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginTop: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HelpCircle size={18} style={{ color: 'var(--color-brand)' }} />
              Frequently Asked Questions
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {faqs.map((faq, i) => (
                <div key={i} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                  <button 
                    onClick={() => setOpenFaq(openFaq === i ? null : i)} 
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', background: openFaq === i ? 'rgba(15,169,88,0.06)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', paddingRight: '12px' }}>{faq.q}</span>
                    <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                  </button>
                  {openFaq === i && (
                    <div style={{ padding: '14px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', borderTop: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contact Details */}
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginTop: 0, marginBottom: '16px' }}>
              Contact Support
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mail size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Email Support</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>support@enterprise-carpooling.com</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(16,185,129,0.1)', color: 'var(--color-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Phone size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Toll-Free Helpline</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>+1 (800) 555-RIDE (9 AM - 6 PM IST)</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MapPin size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Headquarters</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Tech Park, Block C, SG Highway, Ahmedabad, India</div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right column: Report an Issue Form */}
        <div style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginTop: 0, marginBottom: '16px' }}>
            Report an Issue
          </h3>

          <form onSubmit={handleReportIssue} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <div className="select-wrapper">
                <select 
                  className="input-field"
                  style={{ paddingLeft: '16px', appearance: 'none', cursor: 'pointer' }}
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  <option value="General">General Inquiry</option>
                  <option value="Account">Account &amp; Security</option>
                  <option value="Payment">Payments &amp; Wallet</option>
                  <option value="Ride Booking">Ride Booking/Offers</option>
                  <option value="GPS/Map">GPS &amp; Live Tracking</option>
                  <option value="Feedback">Feedback/Suggestions</option>
                </select>
                <div className="select-arrow"><ChevronDown size={16} /></div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Subject</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Wallet charge not showing up"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                required
                style={{ paddingLeft: '16px' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Detailed Description</label>
              <textarea
                className="input-field"
                placeholder="Please describe your issue in detail so we can help you faster..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
                style={{ 
                  padding: '12px 16px', 
                  minHeight: '120px', 
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  fontSize: '13px',
                  lineHeight: '1.5'
                }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', height: '44px', fontSize: '13px', fontWeight: '700', marginTop: '8px' }}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="animate-spin" size={16} /> : 'Submit Support Ticket'}
            </button>
          </form>
        </div>

      </div>

    </div>
  );
};

export default Help;
