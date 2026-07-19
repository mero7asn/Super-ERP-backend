import { useState, useEffect } from 'react';
import API from '../services/api';

const OfferVersionsModal = ({ offerId, onClose }) => {
  const [versions, setVersions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [currentVersion, setCurrentVersion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const res = await API.get(`/offers/${offerId}/versions`);
        const data = res.data.data || [];
        setVersions(data);
        setCurrentVersion(res.data.currentVersion);
        setSelected(data.find(v => v.version === res.data.currentVersion) || data[0] || null);
      } catch (err) {
        console.error('Failed to load versions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVersions();
  }, [offerId]);

  const statusBadge = (status) => {
    const map = { Draft: 'badge-new', Sent: 'badge-contacted', Viewed: 'badge-qualified', Accepted: 'badge-converted', Rejected: 'badge-lost', Expired: 'badge-meta', Completed: 'badge-completed', Canceled: 'badge-lost', Refunded: 'badge-meta' };
    return map[status] || 'badge-new';
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 20
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 12, padding: 0, maxWidth: 960, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Sent Versions</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Every previously sent offer is preserved here for audit.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>

        {loading ? (
          <div className="loading-state" style={{ padding: 40 }}><div className="spinner" />Loading versions...</div>
        ) : versions.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}><p>No versions sent yet.</p></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', minHeight: 0, flex: 1 }}>
            {/* Left: list of versions */}
            <div style={{ borderRight: '1px solid var(--border-color)', overflowY: 'auto', maxHeight: '70vh' }}>
              {versions.map((v) => {
                const isSelected = selected && selected._id === v._id;
                const isCurrent = v.version === currentVersion;
                const email = v.emailRef;
                return (
                  <div
                    key={v._id}
                    onClick={() => setSelected(v)}
                    style={{
                      padding: '14px 16px', cursor: 'pointer',
                      borderBottom: '1px solid var(--border-color)',
                      background: isSelected ? 'var(--bg-secondary)' : 'transparent',
                      borderLeft: `3px solid ${isSelected ? 'var(--accent-primary)' : 'transparent'}`
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>v{v.version}</span>
                      {isCurrent && <span className="badge badge-new" style={{ fontSize: 9, padding: '1px 6px' }}>CURRENT</span>}
                      <span className={`badge ${statusBadge(v.statusAtSnapshot)}`} style={{ fontSize: 10, padding: '1px 7px' }}>{v.statusAtSnapshot}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                      {email ? `To: ${email.toEmail || '—'}` : 'No email record'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {v.createdAt ? new Date(v.createdAt).toLocaleString() : ''}
                    </div>
                    {v.changeSummary && (
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6, fontStyle: 'italic' }}>{v.changeSummary}</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right: preview of selected version */}
            <div style={{ overflowY: 'auto', maxHeight: '70vh', padding: 24 }}>
              {selected ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <h3 style={{ fontSize: 16, margin: 0 }}>{selected.title}</h3>
                    <span className="badge badge-meta" style={{ fontSize: 10, padding: '1px 7px', fontWeight: 700 }}>v{selected.version}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    <strong>${selected.price != null ? Number(selected.price).toLocaleString() : '—'}</strong>
                    {selected.validUntil && ` • Valid until ${new Date(selected.validUntil).toLocaleDateString()}`}
                    {selected.offerType && ` • ${selected.offerType}`}
                  </div>
                  {selected.requirement && (
                    <div style={{ fontSize: 12, color: 'var(--accent-primary)', marginTop: 6, background: 'var(--bg-secondary)', borderRadius: 6, padding: '8px 10px', border: '1px solid var(--border-color)' }}>
                      <strong>Revision requirement:</strong> {selected.requirement}
                    </div>
                  )}
                  {selected.changeSummary && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{selected.changeSummary}</div>
                  )}

                  <div style={{ marginTop: 16, border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: '8px 12px', fontSize: 11, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                      {selected.emailRef ? (
                        <>
                          From: {selected.emailRef.fromEmail || '—'} • To: {selected.emailRef.toEmail || '—'} •{' '}
                          {selected.emailRef.sentAt ? new Date(selected.emailRef.sentAt).toLocaleString() : ''} • Status: {selected.emailRef.status}
                        </>
                      ) : (
                        'Snapshot only (no email artifact)'
                      )}
                    </div>
                    {selected.emailRef && selected.emailRef.htmlBody ? (
                      <iframe
                        title={`offer-version-${selected.version}`}
                        sandbox=""
                        style={{ width: '100%', height: 360, border: 'none', background: '#fff' }}
                        srcDoc={selected.emailRef.htmlBody}
                      />
                    ) : (
                      <div style={{ padding: 16, fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                        {selected.description}
                        {selected.emailRef && selected.emailRef.body ? (
                          <div style={{ marginTop: 12, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>{selected.emailRef.body}</div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="empty-state"><p>Select a version to preview.</p></div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfferVersionsModal;
