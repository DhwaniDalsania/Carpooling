import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MessageSquare, Send, Loader2, User, Clock, Navigation, RefreshCw } from 'lucide-react';
import { io } from 'socket.io-client';

export const Chat = ({ onBack, token, user }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typedMessage, setTypedMessage] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Fetch active and history trips as conversations
  const fetchConversations = async () => {
    setLoadingList(true);
    setErrorMsg('');
    try {
      const [activeRes, historyRes] = await Promise.all([
        fetch('/api/trips?history=false', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/trips?history=true', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      let activeData = [];
      let historyData = [];

      if (activeRes.ok) activeData = await activeRes.json();
      if (historyRes.ok) historyData = await historyRes.json();

      const combined = [...activeData, ...historyData];
      
      // Filter out duplicates and format them
      const unique = combined.reduce((acc, current) => {
        const x = acc.find(item => item.id === current.id);
        if (!x) return acc.concat([current]);
        return acc;
      }, []);

      setConversations(unique);
    } catch (err) {
      console.error('[Chat fetchConversations]', err);
      setErrorMsg('We couldn\'t load your chat rooms. Please check your internet connection.');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchConversations();
    }
  }, [token]);

  // Fetch chat history for selected trip
  const fetchChatHistory = async (tripId) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('[Chat fetchChatHistory]', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Socket.io: Listen for messages when a conversation is selected
  useEffect(() => {
    if (!selectedTrip || !token) return;

    fetchChatHistory(selectedTrip.id);

    const socket = io('/chat');
    socketRef.current = socket;

    socket.emit('join:trip', selectedTrip.id);

    const handleIncomingMsg = (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) {
          return prev;
        }
        return [...prev, msg];
      });
    };

    socket.on('message:new', handleIncomingMsg);
    socket.on('message:receive', handleIncomingMsg);

    return () => {
      socket.off('message:new', handleIncomingMsg);
      socket.off('message:receive', handleIncomingMsg);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [selectedTrip, token]);

  // Scroll to bottom helper
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!typedMessage.trim() || !socketRef.current || !selectedTrip) return;

    socketRef.current.emit('message:send', {
      tripId: selectedTrip.id,
      senderId: user.id,
      text: typedMessage.trim()
    }, (result) => {
      if (!result?.ok) {
        console.error(result?.error || 'Failed to send message.');
        return;
      }
      setMessages((prev) => {
        if (prev.some((message) => message.id === result.message.id)) return prev;
        return [...prev, result.message];
      });
    });

    setTypedMessage('');
  };

  // Helper to format timestamps
  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getPartnerName = (trip) => {
    const isDriver = trip.driverId === user?.id;
    if (isDriver) {
      if (trip.passengers && trip.passengers.length > 0) {
        return trip.passengers.map(p => p.user?.name).join(', ');
      }
      return 'Passenger (Awaiting Booking)';
    }
    return trip.driver?.name || 'Ride Driver';
  };

  const ConversationSkeleton = () => (
    <div style={{ padding: '16px', borderBottom: '1px solid var(--border-default)', display: 'flex', gap: '12px', alignItems: 'center' }}>
      <div className="shimmer-bg" style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0 }}></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div className="shimmer-bg" style={{ width: '50%', height: '12px', borderRadius: '4px' }}></div>
          <div className="shimmer-bg" style={{ width: '20%', height: '8px', borderRadius: '4px' }}></div>
        </div>
        <div className="shimmer-bg" style={{ width: '80%', height: '10px', borderRadius: '4px' }}></div>
      </div>
    </div>
  );

  const MessageSkeleton = ({ isMe }) => (
    <div style={{
      alignSelf: isMe ? 'flex-end' : 'flex-start',
      maxWidth: '60%',
      width: '120px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    }}>
      <div className="shimmer-bg" style={{
        height: '36px',
        width: '100%',
        borderRadius: '12px',
        borderTopRightRadius: isMe ? '2px' : '12px',
        borderTopLeftRadius: isMe ? '12px' : '2px',
      }}></div>
      <div className="shimmer-bg" style={{ width: '30px', height: '8px', alignSelf: isMe ? 'flex-end' : 'flex-start', borderRadius: '2px' }}></div>
    </div>
  );

  return (
    <div className="dashboard-container animate-fade-in" style={{ maxWidth: '1100px', padding: '24px' }}>
      
      <style>{`
        .chat-layout-container {
          display: flex;
          min-height: 600px;
          max-height: 600px;
          border: 1px solid var(--border-default);
          border-radius: 12px;
          overflow: hidden;
          background-color: var(--bg-card);
        }
        .chat-sidebar {
          width: 360px;
          border-right: 1px solid var(--border-default);
          display: flex;
          flex-direction: column;
          background-color: var(--bg-input);
        }
        .chat-window {
          flex: 1;
          display: flex;
          flex-direction: column;
          background-color: var(--bg-card);
        }
        @media (max-width: 768px) {
          .chat-layout-container {
            min-height: 520px;
            max-height: 520px;
          }
          .chat-sidebar {
            width: 100% !important;
            display: ${selectedTrip && mobileShowChat ? 'none !important' : 'flex !important'};
          }
          .chat-window {
            width: 100% !important;
            display: ${selectedTrip && mobileShowChat ? 'flex !important' : 'none !important'};
            border-left: none !important;
          }
        }
      `}</style>

      {/* Settings back link */}
      <button className="back-header" onClick={onBack} style={{ marginBottom: '16px' }}>
        <ArrowLeft size={16} />
        <span className="text-page-title">Settings</span>
      </button>

      {/* Inline Error display */}
      {errorMsg && (
        <div className="feedback-alert feedback-error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', marginBottom: '16px', borderRadius: '8px' }}>
          <span className="text-body" style={{ color: '#f87171' }}>{errorMsg}</span>
          <button className="btn-retry" onClick={fetchConversations}>
            <RefreshCw size={12} />
            <span>Retry</span>
          </button>
        </div>
      )}

      <div className="chat-layout-container">
        
        {/* Left Side: Conversations list */}
        <div className="chat-sidebar">
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border-default)' }}>
            <h3 className="text-card-title" style={{ margin: 0 }}>Conversations</h3>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingList ? (
              <>
                <ConversationSkeleton />
                <ConversationSkeleton />
                <ConversationSkeleton />
              </>
            ) : conversations.length === 0 ? (
              <div style={{ 
                padding: '32px 24px', 
                color: 'var(--text-label)', 
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                marginTop: '32px'
              }}>
                <MessageSquare size={32} style={{ opacity: 0.5 }} />
                <div>
                  <h4 className="text-card-title" style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>No active chats</h4>
                  <p className="text-meta">Bookings and ride offers will automatically open a chat room here.</p>
                </div>
              </div>
            ) : (
              conversations.map((trip) => {
                const isSelected = selectedTrip?.id === trip.id;
                const partner = getPartnerName(trip);
                return (
                  <div
                    key={trip.id}
                    onClick={() => {
                      setSelectedTrip(trip);
                      setMobileShowChat(true);
                    }}
                    style={{
                      padding: '16px 24px',
                      borderBottom: '1px solid var(--border-default)',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'rgba(13, 148, 136, 0.08)' : 'transparent',
                      transition: 'background-color var(--transition-fast)',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start'
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: isSelected ? 'rgba(13,148,136,0.15)' : 'var(--bg-card)',
                      color: isSelected ? 'var(--accent-teal)' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      border: '1px solid var(--border-default)'
                    }}>
                      <User size={18} />
                    </div>
                    
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                        <h4 className="text-card-title" style={{ fontSize: '14px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {partner}
                        </h4>
                        <span className="text-meta" style={{ fontSize: '10px', flexShrink: 0 }}>
                          {trip.ride?.datetime ? new Date(trip.ride.datetime).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                        </span>
                      </div>
 
                      <div className="text-meta" style={{ marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Navigation size={10} style={{ color: 'var(--text-label)', flexShrink: 0 }} />
                        <span>{trip.ride?.pickupAddress} to {trip.ride?.destAddress}</span>
                      </div>
 
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                        <span style={{ 
                          fontSize: '9px', 
                          fontWeight: '700', 
                          padding: '2px 6px', 
                          borderRadius: '3px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          backgroundColor: trip.status === 'booked' ? 'rgba(59,130,246,0.15)' : (trip.status === 'completed' || trip.status === 'payment_completed' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'),
                          color: trip.status === 'booked' ? '#3b82f6' : (trip.status === 'completed' || trip.status === 'payment_completed' ? 'var(--accent-teal)' : '#f59e0b')
                        }}>
                          {trip.status === 'payment_pending' ? 'Payment Pending' : trip.status}
                        </span>
                      </div>
 
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Chat Window */}
        <div className="chat-window">
          {selectedTrip ? (
            <>
              {/* Chat Header */}
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'var(--bg-input)' }}>
                {/* Mobile Back to List Button */}
                <button 
                  onClick={() => setMobileShowChat(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    padding: '4px',
                    marginRight: '4px',
                    display: 'none'
                  }}
                  className="mobile-back-chat"
                >
                  <style>{`
                    @media (max-width: 768px) {
                      .mobile-back-chat { display: inline-block !important; }
                    }
                  `}</style>
                  <ArrowLeft size={18} />
                </button>

                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <User size={16} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div className="text-card-title" style={{ fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getPartnerName(selectedTrip)}
                  </div>
                  <div className="text-meta" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedTrip.ride?.pickupAddress} to {selectedTrip.ride?.destAddress}
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {loadingMessages ? (
                  <>
                    <MessageSkeleton isMe={false} />
                    <MessageSkeleton isMe={true} />
                    <MessageSkeleton isMe={false} />
                  </>
                ) : messages.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-label)', gap: '12px' }}>
                    <MessageSquare size={32} style={{ opacity: 0.4 }} />
                    <span className="text-meta">No messages in this chat. Start typing below.</span>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === user.id;
                    return (
                      <div
                        key={msg.id}
                        style={{
                          alignSelf: isMe ? 'flex-end' : 'flex-start',
                          maxWidth: '70%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isMe ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <div
                          style={{
                            padding: '10px 14px',
                            borderRadius: '12px',
                            borderTopRightRadius: isMe ? '2px' : '12px',
                            borderTopLeftRadius: isMe ? '12px' : '2px',
                            backgroundColor: isMe ? 'var(--accent-teal-dark)' : 'var(--bg-input)',
                            color: '#F1F5F9',
                            fontSize: '13px',
                            lineHeight: '1.4',
                            wordBreak: 'break-word',
                            border: isMe ? 'none' : '1px solid var(--border-default)'
                          }}
                        >
                          {msg.text}
                        </div>
                        <span className="text-meta" style={{ fontSize: '9px', marginTop: '4px' }}>
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Form */}
              <form onSubmit={handleSendMessage} style={{ padding: '16px 24px', borderTop: '1px solid var(--border-default)', display: 'flex', gap: '12px', backgroundColor: 'var(--bg-input)' }}>
                <input
                  type="text"
                  className="input-field text-body"
                  placeholder="Type a message..."
                  value={typedMessage}
                  onChange={e => setTypedMessage(e.target.value)}
                  style={{ flex: 1, paddingLeft: '16px', height: '42px', fontSize: '13px' }}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ height: '42px', width: '42px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: '8px' }}
                  disabled={!typedMessage.trim()}
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-label)', gap: '12px', padding: '40px' }}>
              <MessageSquare size={48} style={{ opacity: 0.2 }} />
              <div className="text-card-title" style={{ fontSize: '15px' }}>Your Chats</div>
              <div className="text-meta" style={{ textAlign: 'center', maxWidth: '300px', lineHeight: '1.5' }}>
                Select a ride from the list on the left to message your driver or passengers.
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default Chat;
