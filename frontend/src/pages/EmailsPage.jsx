import { useState, useEffect, useRef } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';

// ── Avatar helper ──────────────────────────────────────────────────────────────
const Avatar = ({ person, size = 34 }) => {
  const initials = person
    ? `${person.firstName?.[0] || ''}${person.lastName?.[0] || ''}`.toUpperCase()
    : '?';
  const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'];
  const color = colors[(initials.charCodeAt(0) || 0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontWeight: 700,
      fontSize: size * 0.38, color: '#fff', flexShrink: 0
    }}>
      {initials}
    </div>
  );
};

// ── Time formatter ─────────────────────────────────────────────────────────────
const fmtTime = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffH = Math.floor(diffMins / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ── Thread bubble ──────────────────────────────────────────────────────────────
const ThreadBubble = ({ email, isOwn }) => (
  <div style={{
    display: 'flex', gap: 10, flexDirection: isOwn ? 'row-reverse' : 'row',
    alignItems: 'flex-start', marginBottom: 12
  }}>
    <Avatar person={email.senderId} size={30} />
    <div style={{ maxWidth: '75%' }}>
      <div style={{
        display: 'flex', gap: 8, alignItems: 'baseline',
        flexDirection: isOwn ? 'row-reverse' : 'row', marginBottom: 4
      }}>
        <span style={{ fontWeight: 600, fontSize: 12 }}>
          {email.senderId?.firstName} {email.senderId?.lastName}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmtTime(email.sentAt)}</span>
      </div>
      <div style={{
        background: isOwn
          ? 'linear-gradient(135deg, rgba(37,99,235,0.25), rgba(124,58,237,0.2))'
          : 'rgba(255,255,255,0.05)',
        border: `1px solid ${isOwn ? 'rgba(37,99,235,0.35)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: isOwn ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
        padding: '10px 14px',
        fontSize: 13, lineHeight: 1.6,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word'
      }}>
        {email.body}
      </div>
    </div>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────
const EmailsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('inbox');
  const [emails, setEmailList] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [thread, setThread] = useState([]); // replies for selected email
  const [loadingThread, setLoadingThread] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Compose / Reply state
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyMsg, setReplyMsg] = useState({ type: '', text: '' });

  // New email compose state
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  const threadBottomRef = useRef(null);

  // ── Data fetching ────────────────────────────────────────────────────────────
  const fetchEmails = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'inbox' ? '/hrm/emails/inbox' : '/hrm/emails/sent';
      const { data } = await API.get(endpoint);
      setEmailList(data.data || []);
      if (data.unreadCount !== undefined) setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await API.get('/auth/users-list');
      setUsersList(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchThread = async (emailId) => {
    setLoadingThread(true);
    try {
      const { data } = await API.get(`/hrm/emails/${emailId}/thread`);
      setThread(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingThread(false);
    }
  };

  const markRead = async (emailId) => {
    try {
      await API.put(`/hrm/emails/${emailId}/read`);
      setEmailList(prev => prev.map(e => e._id === emailId ? { ...e, isRead: true } : e));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (_) { /* silent */ }
  };

  useEffect(() => {
    if (activeTab !== 'compose') {
      fetchEmails();
      setSelectedEmail(null);
      setThread([]);
      setShowReplyBox(false);
    } else {
      fetchUsers();
    }
    setStatusMessage({ type: '', text: '' });
  }, [activeTab]);

  // Scroll thread to bottom when new reply arrives
  useEffect(() => {
    threadBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  const handleSelectEmail = (email) => {
    setSelectedEmail(email);
    setShowReplyBox(false);
    setReplyBody('');
    setReplyMsg({ type: '', text: '' });
    fetchThread(email._id);
    // Mark as read if in inbox and not yet read
    if (activeTab === 'inbox' && !email.isRead) markRead(email._id);
  };

  // ── Send reply ───────────────────────────────────────────────────────────────
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setSendingReply(true);
    setReplyMsg({ type: '', text: '' });

    // Reply goes to the other party: if I'm the recipient → reply to sender; if I'm the sender → reply to recipient
    const isSender = selectedEmail.senderId?._id === user?._id || selectedEmail.senderId === user?._id;
    const replyToEmail = isSender
      ? selectedEmail.recipientId?.email
      : selectedEmail.senderId?.email;

    // Root thread at the original email (not a reply's _id)
    const rootId = selectedEmail.parentId || selectedEmail._id;

    try {
      const { data } = await API.post('/hrm/emails', {
        recipientEmail: replyToEmail,
        subject: selectedEmail.subject.startsWith('Re:')
          ? selectedEmail.subject
          : `Re: ${selectedEmail.subject}`,
        body: replyBody.trim(),
        parentId: rootId
      });
      setThread(prev => [...prev, data.data]);
      setReplyBody('');
      setShowReplyBox(false);
      setReplyMsg({ type: 'success', text: 'Reply sent!' });
      setTimeout(() => setReplyMsg({ type: '', text: '' }), 2000);
    } catch (err) {
      setReplyMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to send reply.'
      });
    } finally {
      setSendingReply(false);
    }
  };

  // ── Send new email ───────────────────────────────────────────────────────────
  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!composeTo || !composeSubject || !composeBody) {
      setStatusMessage({ type: 'error', text: 'All fields are required.' });
      return;
    }
    setSending(true);
    try {
      await API.post('/hrm/emails', {
        recipientEmail: composeTo,
        subject: composeSubject,
        body: composeBody
      });
      setStatusMessage({ type: 'success', text: 'Email sent successfully!' });
      setComposeTo(''); setComposeSubject(''); setComposeBody('');
      setTimeout(() => setActiveTab('sent'), 1000);
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Failed to send.' });
    } finally {
      setSending(false);
    }
  };

  // ── Filter ───────────────────────────────────────────────────────────────────
  const filteredEmails = emails.filter((e) => {
    const term = searchQuery.toLowerCase();
    const other = activeTab === 'inbox' ? e.senderId : e.recipientId;
    const name = other ? `${other.firstName} ${other.lastName}`.toLowerCase() : '';
    const email = other ? other.email.toLowerCase() : '';
    return (
      e.subject.toLowerCase().includes(term) ||
      e.body.toLowerCase().includes(term) ||
      name.includes(term) ||
      email.includes(term)
    );
  });

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Internal Communications</h1>
          <p className="page-subtitle">Secure, threaded internal messaging — all messages are permanent and auditable</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, minHeight: 600 }}>
        {/* Sidebar nav */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 200, flexShrink: 0 }}>
          <button
            className={`btn ${activeTab === 'inbox' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('inbox')}
            style={{ justifyContent: 'flex-start', padding: '12px 16px', position: 'relative' }}
          >
            📥 Inbox
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: '#EF4444', color: '#fff', borderRadius: 999,
                fontSize: 10, fontWeight: 700, padding: '2px 7px', lineHeight: 1.4
              }}>{unreadCount}</span>
            )}
          </button>
          <button
            className={`btn ${activeTab === 'sent' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('sent')}
            style={{ justifyContent: 'flex-start', padding: '12px 16px' }}
          >
            📤 Sent
          </button>
          <button
            className={`btn ${activeTab === 'compose' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('compose')}
            style={{ justifyContent: 'flex-start', padding: '12px 16px' }}
          >
            ✏️ New Email
          </button>
        </div>

        {/* Main content card */}
        <div className="card" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>

          {/* ── COMPOSE NEW ── */}
          {activeTab === 'compose' && (
            <div style={{ padding: 28 }}>
              <h3 style={{ margin: '0 0 20px 0' }}>Compose New Message</h3>
              {statusMessage.text && (
                <div className={`alert alert-${statusMessage.type === 'error' ? 'error' : 'success'}`}
                  style={{ marginBottom: 16 }}>
                  {statusMessage.text}
                </div>
              )}
              <form onSubmit={handleSendEmail} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">To</label>
                  <select className="form-input" value={composeTo} onChange={e => setComposeTo(e.target.value)} required>
                    <option value="">Select a colleague...</option>
                    {usersList.filter(u => u.email !== user?.email).map(u => (
                      <option key={u.email} value={u.email}>
                        {u.firstName} {u.lastName} · {u.role} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Subject</label>
                  <input className="form-input" placeholder="Subject line..." value={composeSubject}
                    onChange={e => setComposeSubject(e.target.value)} required />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Message</label>
                  <textarea className="form-input" rows={9} placeholder="Write your message..."
                    value={composeBody} onChange={e => setComposeBody(e.target.value)}
                    style={{ resize: 'vertical' }} required />
                </div>
                <button type="submit" className="btn btn-primary" disabled={sending} style={{ alignSelf: 'flex-start' }}>
                  {sending ? 'Sending…' : '📨 Send Message'}
                </button>
              </form>
            </div>
          )}

          {/* ── INBOX / SENT TWO-COLUMN LAYOUT ── */}
          {activeTab !== 'compose' && (
            <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>

              {/* Left: email list */}
              <div style={{
                width: 300, flexShrink: 0, borderRight: '1px solid var(--border-color)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden'
              }}>
                {/* Search */}
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)' }}>
                  <input
                    className="form-input"
                    placeholder="🔍 Search…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ fontSize: 12, padding: '7px 12px' }}
                  />
                </div>

                {/* List */}
                <div style={{ overflowY: 'auto', flexGrow: 1 }}>
                  {loading ? (
                    <div className="loading-state" style={{ padding: 24 }}>Loading…</div>
                  ) : filteredEmails.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40, fontSize: 13 }}>
                      No messages found
                    </div>
                  ) : (
                    filteredEmails.map(e => {
                      const other = activeTab === 'inbox' ? e.senderId : e.recipientId;
                      const isSelected = selectedEmail?._id === e._id;
                      const isUnread = activeTab === 'inbox' && !e.isRead;
                      return (
                        <div
                          key={e._id}
                          onClick={() => handleSelectEmail(e)}
                          style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                            background: isSelected
                              ? 'rgba(37,99,235,0.14)'
                              : isUnread ? 'rgba(37,99,235,0.06)' : 'transparent',
                            borderLeft: isSelected
                              ? '3px solid var(--accent-secondary)'
                              : isUnread ? '3px solid rgba(37,99,235,0.5)' : '3px solid transparent',
                            cursor: 'pointer', transition: 'all 0.15s'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                            <span style={{
                              fontSize: 12, fontWeight: isUnread ? 700 : 500,
                              color: isUnread ? 'var(--text-primary)' : 'var(--text-secondary)'
                            }}>
                              {other ? `${other.firstName} ${other.lastName}` : 'Unknown'}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmtTime(e.sentAt)}</span>
                          </div>
                          <div style={{
                            fontSize: 13, fontWeight: isUnread ? 600 : 400,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                          }}>
                            {e.subject}
                          </div>
                          <div style={{
                            fontSize: 11, color: 'var(--text-muted)', marginTop: 2,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                          }}>
                            {e.body.substring(0, 60)}…
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right: email detail + thread + reply */}
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {!selectedEmail ? (
                  <div style={{
                    flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-muted)', flexDirection: 'column', gap: 12
                  }}>
                    <span style={{ fontSize: 40 }}>✉️</span>
                    <span style={{ fontSize: 14 }}>Select an email to read it</span>
                  </div>
                ) : (
                  <>
                    {/* Email header */}
                    <div style={{
                      padding: '20px 24px', borderBottom: '1px solid var(--border-color)',
                      background: 'rgba(255,255,255,0.02)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flexGrow: 1 }}>
                          <h3 style={{ margin: '0 0 8px 0', fontSize: 16 }}>{selectedEmail.subject}</h3>
                          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
                            <span>
                              <strong>From:</strong>{' '}
                              {selectedEmail.senderId
                                ? `${selectedEmail.senderId.firstName} ${selectedEmail.senderId.lastName} (${selectedEmail.senderId.email})`
                                : 'Unknown'}
                            </span>
                            <span>
                              <strong>To:</strong>{' '}
                              {selectedEmail.recipientId
                                ? `${selectedEmail.recipientId.firstName} ${selectedEmail.recipientId.lastName}`
                                : 'Unknown'}
                            </span>
                            <span><strong>Sent:</strong> {new Date(selectedEmail.sentAt).toLocaleString()}</span>
                          </div>
                        </div>
                        {/* Reply button in header */}
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => { setShowReplyBox(true); setReplyMsg({ type: '', text: '' }); }}
                          style={{ flexShrink: 0, padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                          ↩ Reply
                        </button>
                      </div>
                    </div>

                    {/* Thread viewer: original + replies */}
                    <div style={{ flexGrow: 1, overflowY: 'auto', padding: '20px 24px' }}>
                      {/* Original message bubble */}
                      <ThreadBubble
                        email={selectedEmail}
                        isOwn={selectedEmail.senderId?._id === user?._id || selectedEmail.senderId === user?._id}
                      />

                      {/* Thread divider */}
                      {thread.length > 0 && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0',
                          color: 'var(--text-muted)', fontSize: 11
                        }}>
                          <div style={{ flexGrow: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                          <span>{thread.length} {thread.length === 1 ? 'reply' : 'replies'}</span>
                          <div style={{ flexGrow: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                        </div>
                      )}

                      {/* Reply bubbles */}
                      {loadingThread ? (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>
                          Loading thread…
                        </div>
                      ) : (
                        thread.map(reply => (
                          <ThreadBubble
                            key={reply._id}
                            email={reply}
                            isOwn={reply.senderId?._id === user?._id || reply.senderId === user?._id}
                          />
                        ))
                      )}
                      <div ref={threadBottomRef} />
                    </div>

                    {/* Inline reply composer */}
                    {showReplyBox && (
                      <div style={{
                        borderTop: '1px solid var(--border-color)',
                        padding: '16px 24px',
                        background: 'rgba(37,99,235,0.04)'
                      }}>
                        {replyMsg.text && (
                          <div className={`alert alert-${replyMsg.type === 'error' ? 'error' : 'success'}`}
                            style={{ marginBottom: 10, padding: '6px 12px', fontSize: 12 }}>
                            {replyMsg.text}
                          </div>
                        )}
                        <form onSubmit={handleSendReply} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                          <Avatar person={user} size={30} />
                          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 2 }}>
                              Replying to <strong>
                                {activeTab === 'inbox'
                                  ? `${selectedEmail.senderId?.firstName} ${selectedEmail.senderId?.lastName}`
                                  : `${selectedEmail.recipientId?.firstName} ${selectedEmail.recipientId?.lastName}`}
                              </strong>
                            </div>
                            <textarea
                              className="form-input"
                              rows={3}
                              placeholder="Write your reply…"
                              value={replyBody}
                              onChange={e => setReplyBody(e.target.value)}
                              style={{ resize: 'none', fontSize: 13 }}
                              autoFocus
                              required
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                            <button type="submit" className="btn btn-primary btn-sm" disabled={sendingReply}
                              style={{ padding: '9px 18px' }}>
                              {sendingReply ? 'Sending…' : '↩ Send'}
                            </button>
                            <button type="button" className="btn btn-secondary btn-sm"
                              onClick={() => { setShowReplyBox(false); setReplyBody(''); }}
                              style={{ padding: '7px 18px' }}>
                              Cancel
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Show "Reply" bar if reply box is hidden */}
                    {!showReplyBox && (
                      <div style={{
                        borderTop: '1px solid var(--border-color)',
                        padding: '12px 24px',
                        display: 'flex', alignItems: 'center', gap: 12
                      }}>
                        <Avatar person={user} size={28} />
                        <button
                          className="btn btn-secondary"
                          onClick={() => setShowReplyBox(true)}
                          style={{
                            flexGrow: 1, textAlign: 'left', padding: '10px 14px',
                            color: 'var(--text-muted)', fontSize: 13, justifyContent: 'flex-start'
                          }}
                        >
                          ↩ Click to reply to this thread…
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailsPage;
