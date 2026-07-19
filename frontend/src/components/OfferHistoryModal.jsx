import { useState, useEffect } from 'react';
import API from '../services/api';

const OfferHistoryModal = ({ offerId, onClose, onViewVersions }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await API.get(`/offers/${offerId}/history`);
        setHistory(res.data.data || []);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [offerId]);

  const getActionIcon = (action) => {
    const icons = {
      created: '➕',
      sent: '📤',
      viewed: '👁️',
      accepted: '✅',
      rejected: '❌',
      expired: '⏰',
      completed: '🎉',
      canceled: '🚫',
      refunded: '💸',
      updated: '✏️',
      resend: '🔄',
      revised: '🔁',
      version_sent: '📨',
      image_added: '🖼️',
      image_removed: '🗑️'
    };
    return icons[action] || '📋';
  };

  const renderChanges = (changes) => {
    if (!changes || Object.keys(changes).length === 0) return null;
    return (
      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {Object.keys(changes).map(field => {
          const { from, to } = changes[field];
          const fmt = (v) => {
            if (field === 'price') return v != null ? '$' + Number(v).toLocaleString() : '—';
            if (field === 'validUntil') return v ? new Date(v).toLocaleDateString() : '—';
            if (v == null) return '—';
            return String(v);
          };
          return (
            <div key={field} style={{
              fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-secondary)',
              borderRadius: 6, padding: '4px 8px', border: '1px solid var(--border-color)'
            }}>
              <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{field.replace(/([A-Z])/g, ' $1')}</span>:
              <span style={{ color: 'var(--status-lost)', textDecoration: 'line-through', margin: '0 4px' }}>{fmt(from)}</span>
              <span>→</span>
              <span style={{ color: 'var(--status-converted)', fontWeight: 600, margin: '0 4px' }}>{fmt(to)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 20
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 12, padding: 32, maxWidth: 640, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', maxHeight: '80vh', overflowY: 'auto'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Offer History</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {onViewVersions && (
              <button
                onClick={onViewVersions}
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '4px 10px', fontSize: 12, cursor: 'pointer', color: 'var(--accent-primary)' }}
              >
                🗂️ Sent Versions
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
          </div>
        </div>
        {loading ? (
          <div className="loading-state"><div className="spinner" />Loading history...</div>
        ) : history.length === 0 ? (
          <div className="empty-state"><p>No history yet.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {history.map((entry, idx) => (
              <div key={entry._id || idx} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: idx < history.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                <div style={{ fontSize: 20, width: 32, textAlign: 'center' }}>{getActionIcon(entry.action)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: 14, textTransform: 'capitalize' }}>{entry.action.replace('_', ' ')}</span>
                    {entry.version != null && (
                      <span className="badge badge-meta" style={{ fontSize: 10, padding: '1px 7px', fontWeight: 700 }}>v{entry.version}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{entry.details}</div>
                  {renderChanges(entry.changes)}
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {entry.performedBy ? `${entry.performedBy.firstName} ${entry.performedBy.lastName}` : 'System'} • {new Date(entry.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OfferHistoryModal;
