import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MessageSquare, Send, Loader2, User, Clock, Navigation } from 'lucide-react';
import { io } from 'socket.io-client';

export const Chat = ({ onBack, token, user }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typedMessage, setTypedMessage] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
      setErrorMsg('Failed to load chat conversations.');
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

  return (
    <div className="dashboard-container" style={{ maxWidth: '1100px', gap: '20px' }}>
      
      <button className="back-header" onClick={onBack}>
        <ArrowLeft size={16} />
        <span>Settings</span>
      </button>

      <div style={{ display: 'flex', gap: '20px', minHeight: '600px', maxHeight: '600px', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
        
        {/* Left Side: Conversations list */}
        <div style={{ width: '360px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-input)' }}>
          <div style={{ padding: '18px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Conversations</h3>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingList ? (
              <div style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>
                <Loader2 className="animate-spin" size={20} style={{ margin: '0 auto 8px' }} />
                Loading conversations...
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: '40px 20px', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>
                No active or historical trip conversations found.
              </div>
            ) : (
              conversations.map((trip) => {
                const isSelected = selectedTrip?.id === trip.id;
                const partner = getPartnerName(trip);
                return (
                  <div
                    key={trip.id}
                    onClick={() => setSelectedTrip(trip)}
                    style={{
                      padding: '16px',
                      borderBottom: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'rgba(15, 169, 88, 0.08)' : 'transparent',
                      transition: 'background-color 0.2s',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start'
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: isSelected ? 'rgba(15,169,88,0.2)' : 'rgba(255,255,255,0.04)',
                      color: isSelected ? 'var(--color-brand)' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <User size={18} />
                    </div>
                    
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                        <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {partner}
                        </h4>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>
                          {trip.ride?.datetime ? new Date(trip.ride.datetime).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                        </span>
                      </div>

                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Navigation size={10} style={{ color: 'var(--text-muted)' }} />
                        {trip.ride?.pickupAddress} to {trip.ride?.destAddress}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                        <span style={{ 
                          fontSize: '9px', 
                          fontWeight: '700', 
                          padding: '1px 5px', 
                          borderRadius: '3px',
                          backgroundColor: trip.status === 'booked' ? 'rgba(59,130,246,0.15)' : (trip.status === 'completed' || trip.status === 'payment_completed' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'),
                          color: trip.status === 'booked' ? '#3b82f6' : (trip.status === 'completed' || trip.status === 'payment_completed' ? 'var(--color-brand)' : '#f59e0b')
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-card)' }}>
          {selectedTrip ? (
            <>
              {/* Chat Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {getPartnerName(selectedTrip)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {selectedTrip.ride?.pickupAddress} to {selectedTrip.ride?.destAddress}
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {loadingMessages ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '13px' }}>
                    <Loader2 className="animate-spin" size={16} style={{ marginRight: '6px' }} />
                    Loading chat messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: '8px' }}>
                    <MessageSquare size={24} style={{ opacity: 0.5 }} />
                    <span style={{ fontSize: '13px' }}>No messages in this chat. Type below to start.</span>
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
                            backgroundColor: isMe ? 'var(--color-brand)' : 'var(--bg-input)',
                            color: isMe ? 'white' : 'var(--text-primary)',
                            fontSize: '13px',
                            lineHeight: '1.4',
                            wordBreak: 'break-word',
                            border: isMe ? 'none' : '1px solid var(--border-color)'
                          }}
                        >
                          {msg.text}
                        </div>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Form */}
              <form onSubmit={handleSendMessage} style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '10px', backgroundColor: 'var(--bg-input)' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Type a message..."
                  value={typedMessage}
                  onChange={e => setTypedMessage(e.target.value)}
                  style={{ flex: 1, paddingLeft: '16px', height: '42px', fontSize: '13px' }}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ height: '42px', width: '42px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  disabled={!typedMessage.trim()}
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: '12px', padding: '40px' }}>
              <MessageSquare size={48} style={{ opacity: 0.2 }} />
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Your Chats</div>
              <div style={{ fontSize: '13px', textAlign: 'center', maxWidth: '300px', lineHeight: '1.5' }}>
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
