import { useState } from 'react';
import { Icon } from '../components/Icons';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';

const statusBadge = (status) => {
  const map = {
    'Open': 'badge-new', 'In Progress': 'badge-qualified',
    'Resolved': 'badge-converted', 'Closed': 'badge-meta',
    'Canceled': 'badge-lost', 'Paused': 'badge-contacted'
  };
  return map[status] || 'badge-new';
};

const BookingLookupPage = () => {
  const { user } = useAuth();
  const [recordLocator, setRecordLocator] = useState('');
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canAccess = ['Sales Agent', 'Sales Manager', 'Customer Support Agent', 'Customer Support Manager', 'CRM Developer', 'CRM Consultant', 'System Architect', 'Super CRM Administrator'].includes(user?.role);

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!recordLocator) return;
    setLoading(true);
    setError('');
    setBooking(null);
    try {
      const res = await API.get(`/offers/locator/${recordLocator}`);
      setBooking(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Booking not found');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (status) => {
    if (!booking || !confirm(`Change booking status to ${status}?`)) return;
    try {
      await API.put(`/offers/${booking._id}`, { status });
      setBooking(p => ({ ...p, status }));
    } catch {
      setError('Failed to update booking status');
    }
  };

  if (!canAccess) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Access Denied</h1>
        </div>
        <div className="alert alert-error">You do not have permission to access booking lookup.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icon name="search" size={26} style={{ color: 'var(--accent-primary)' }} />
          Booking Lookup
        </h1>
        <p className="page-subtitle">Search for bookings by record locator to view, modify or cancel</p>
      </div>

      <div className="card" style={{ padding: 32, maxWidth: 600 }}>
        <form onSubmit={handleLookup}>
          <div className="form-group">
            <label className="form-label">Record Locator</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                className="form-input"
                placeholder="Enter booking code (e.g. REC-ABC123)"
                value={recordLocator}
                onChange={e => setRecordLocator(e.target.value.toUpperCase())}
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: 'auto' }}>
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        </form>

        {error && <div className="alert alert-error" style={{ marginTop: 16 }}>{error}</div>}

        {booking && (
          <div style={{ marginTop: 24, borderTop: '1px solid var(--border-color)', paddingTop: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Booking Details</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Record Locator</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-primary)' }}>
                  {booking.recordLocator}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Customer</div>
                <div style={{ fontSize: 14 }}>{booking.lead?.name}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Offer</div>
                <div style={{ fontSize: 14 }}>{booking.title}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Amount</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>${booking.price?.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Status</div>
                <span className={`badge ${statusBadge(booking.status)}`}>{booking.status}</span>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Valid Until</div>
                <div style={{ fontSize: 14 }}>{new Date(booking.validUntil).toLocaleDateString()}</div>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{booking.description}</div>
            </div>

            {(user.role === 'Customer Support Agent' || user.role === 'Customer Support Manager' ||
              user.role === 'CRM Developer' || user.role === 'CRM Consultant' ||
              user.role === 'System Architect' || user.role === 'Super CRM Administrator') && (
              <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {booking.status !== 'Canceled' && (
                  <button className="btn btn-secondary btn-sm" onClick={() => handleStatusChange('Canceled')}>
                    Cancel Booking
                  </button>
                )}
                {booking.status !== 'Refunded' && (
                  <button className="btn btn-secondary btn-sm" onClick={() => handleStatusChange('Refunded')}>
                    Process Refund
                  </button>
                )}
                {booking.status !== 'Completed' && (
                  <button className="btn btn-primary btn-sm" onClick={() => handleStatusChange('Completed')}>
                    Mark Complete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingLookupPage;