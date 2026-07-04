import { useState, useEffect } from 'react';
import API from '../services/api';
import { Icon } from '../components/Icons';

const AnalyticsPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const { data } = await API.get('/analytics');
        setStats(data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const conversionRate = stats
    ? stats.leads.total > 0
      ? ((stats.leads.converted / stats.leads.total) * 100).toFixed(1)
      : '0.0'
    : '–';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icon name="analytics" size={26} style={{ color: 'var(--accent-primary)' }} />
          System Analytics
        </h1>
        <p className="page-subtitle">Real-time CRM performance metrics across all modules</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          Loading analytics…
        </div>
      ) : stats ? (
        <>
          {/* Lead Stats */}
          <h2 style={{ fontSize: '14px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
            Lead Overview
          </h2>
          <div className="stat-grid" style={{ marginBottom: '32px' }}>
            <div className="stat-card blue">
              <div className="stat-icon" style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
                <Icon name="target" size={24} />
              </div>
              <div className="stat-value">{stats.leads.total}</div>
              <div className="stat-label">Total Leads</div>
            </div>
            <div className="stat-card cyan">
              <div className="stat-icon" style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
                <Icon name="plus" size={24} />
              </div>
              <div className="stat-value">{stats.leads.new}</div>
              <div className="stat-label">New Leads</div>
            </div>
            <div className="stat-card green">
              <div className="stat-icon" style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
                <Icon name="check" size={24} />
              </div>
              <div className="stat-value">{stats.leads.converted}</div>
              <div className="stat-label">Converted</div>
            </div>
            <div className="stat-card yellow">
              <div className="stat-icon" style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
                <Icon name="trending" size={24} />
              </div>
              <div className="stat-value">{conversionRate}%</div>
              <div className="stat-label">Conversion Rate</div>
            </div>
          </div>

          {/* Ticket Stats */}
          <h2 style={{ fontSize: '14px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
            Support Overview
          </h2>
          <div className="stat-grid" style={{ marginBottom: '32px' }}>
            <div className="stat-card blue">
              <div className="stat-icon" style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
                <Icon name="ticket" size={24} />
              </div>
              <div className="stat-value">{stats.tickets.total}</div>
              <div className="stat-label">Total Tickets</div>
            </div>
            <div className="stat-card red">
              <div className="stat-icon" style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
                <Icon name="unlock" size={24} />
              </div>
              <div className="stat-value">{stats.tickets.open}</div>
              <div className="stat-label">Open Tickets</div>
            </div>
          </div>

          {/* Campaign Stats */}
          <h2 style={{ fontSize: '14px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
            Campaign Overview
          </h2>
          <div className="stat-grid">
            <div className="stat-card blue">
              <div className="stat-icon" style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
                <Icon name="megaphone" size={24} />
              </div>
              <div className="stat-value">{stats.campaigns.total}</div>
              <div className="stat-label">Total Campaigns</div>
            </div>
            <div className="stat-card green">
              <div className="stat-icon" style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
                <Icon name="play" size={24} />
              </div>
              <div className="stat-value">{stats.campaigns.active}</div>
              <div className="stat-label">Active Campaigns</div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default AnalyticsPage;
