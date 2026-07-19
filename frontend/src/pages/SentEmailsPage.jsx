import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';

const SentEmailsPage = () => {
  const { user } = useAuth();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const res = await API.get('/hrm/emails/sent');
      setEmails(res.data.data || []);
    } catch (err) {
      console.error('Failed to load sent emails:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const openPreview = async (email) => {
    setSelectedEmail(email);
    if (email.htmlBody) {
      setPreviewHtml(email.htmlBody);
    } else {
      setPreviewLoading(true);
      try {
        const res = await API.get(`/hrm/emails/${email._id}/preview`);
        setPreviewHtml(res.data.data.htmlBody || `<div style="font-family:Arial,Helvetica,sans-serif;white-space:pre-wrap;padding:24px;">${res.data.data.body}</div>`);
      } catch {
        setPreviewHtml(`<div style="font-family:Arial,Helvetica,sans-serif;white-space:pre-wrap;padding:24px;">${email.body}</div>`);
      } finally {
        setPreviewLoading(false);
      }
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      sent: 'badge-contacted',
      delivered: 'badge-qualified',
      failed: 'badge-lost',
      bounced: 'badge-urgent',
      draft: 'badge-new'
    };
    return map[status] || 'badge-new';
  };

  const filteredEmails = emails.filter(e => {
    const term = search.toLowerCase();
    const matchesSearch = !search ||
      e.subject?.toLowerCase().includes(term) ||
      e.body?.toLowerCase().includes(term) ||
      e.toEmail?.toLowerCase().includes(term) ||
      e.fromEmail?.toLowerCase().includes(term);
    const matchesStatus = statusFilter === 'All' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div className="loading-state"><div className="spinner" />Loading sent emails…</div>;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">Sent Emails</h1>
          <p className="page-subtitle">History of all emails and offers sent from your account</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedEmail ? '1fr 1.5fr' : '1fr', gap: 20, alignItems: 'start' }}>
        {/* Email List */}
        <div className="table-wrapper">
          <div className="table-header">
            <span className="table-title">{filteredEmails.length} Email{filteredEmails.length !== 1 ? 's' : ''}</span>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                className="table-search"
                placeholder="Search by subject, recipient, sender…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: 220 }}
              />
              <select
                className="table-search"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ width: 130 }}
              >
                <option value="All">All Statuses</option>
                <option value="sent">Sent</option>
                <option value="delivered">Delivered</option>
                <option value="failed">Failed</option>
                <option value="bounced">Bounced</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>
          {filteredEmails.length === 0 ? (
            <div className="empty-state">
              <p>No emails match your filters</p>
            </div>
          ) : (
            <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {filteredEmails.map(email => (
                <div
                  key={email._id}
                  onClick={() => openPreview(email)}
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    background: selectedEmail?._id === email._id ? 'rgba(37, 99, 235, 0.06)' : 'transparent',
                    transition: 'background 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>To: {email.toEmail || email.recipientId?.email || '—'}</span>
                    <span className={`badge ${getStatusBadge(email.status)}`} style={{ fontSize: 10 }}>{email.status}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2, color: 'var(--text-primary)' }}>{email.subject}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {email.body?.substring(0, 100) || ''}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {new Date(email.sentAt || email.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview Pane */}
        {selectedEmail && (
          <div className="table-wrapper" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{selectedEmail.subject}</div>
                <button onClick={() => setSelectedEmail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)' }}>×</button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span>From: {selectedEmail.fromEmail || user?.smtpUser || user?.email}</span>
                <span>To: {selectedEmail.toEmail}</span>
                <span>Date: {new Date(selectedEmail.sentAt || selectedEmail.createdAt).toLocaleString()}</span>
              </div>
              {selectedEmail.providerError && (
                <div className="alert alert-error" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
                  Delivery failed: {selectedEmail.providerError}
                </div>
              )}
            </div>
            <div style={{ flex: 1, background: '#ffffff', minHeight: '400px' }}>
              {previewLoading ? (
                <div className="loading-state"><div className="spinner" />Loading preview…</div>
              ) : (
                <iframe
                  srcDoc={previewHtml}
                  title="Email Preview"
                  style={{ width: '100%', height: '500px', border: 'none' }}
                  sandbox=""
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SentEmailsPage;
