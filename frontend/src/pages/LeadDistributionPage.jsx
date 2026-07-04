import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';

const LeadDistributionPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(user?.role);
  const isManager = user?.role === 'Sales Manager';

  useEffect(() => {
    const fetchDistribution = async () => {
      try {
        const { data: response } = await API.get('/leads/distribution');
        setData(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load distribution data');
      } finally {
        setLoading(false);
      }
    };
    fetchDistribution();
  }, []);

  if (loading) return <div className="loading-state"><div className="spinner" />Loading distribution...</div>;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/leads')} className="sidebar-link" style={{ width: 'auto', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
            </svg>
            Back
          </button>
          <div>
            <h1 className="page-title">Lead Distribution</h1>
            <p className="page-subtitle">Monitor how leads are balanced across sales agents</p>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {data && (
        <>
          {/* Stats Cards */}
          <div className="stat-grid" style={{ marginBottom: 20 }}>
            <div className="stat-card blue">
              <div className="stat-value">{data.stats.totalAgents}</div>
              <div className="stat-label">Active Agents</div>
            </div>
            <div className="stat-card cyan">
              <div className="stat-value">{data.stats.averageLeadsPerAgent}</div>
              <div className="stat-label">Avg Leads/Agent</div>
            </div>
            <div className="stat-card green">
              <div className="stat-value">{data.stats.minLeads}</div>
              <div className="stat-label">Min Leads</div>
            </div>
            <div className="stat-card yellow">
              <div className="stat-value">{data.stats.maxLeads}</div>
              <div className="stat-label">Max Leads</div>
            </div>
          </div>

          {/* Balance Status */}
          <div className="table-wrapper" style={{ marginBottom: 20, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Distribution Balance</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Variance: {data.stats.variance} leads (difference between max and min)
                </p>
              </div>
              <div>
                <span className={`badge ${data.stats.isBalanced ? 'badge-qualified' : 'badge-new'}`} style={{ fontSize: 13, padding: '6px 16px' }}>
                  {data.stats.isBalanced ? '✓ Balanced' : '⚠ Needs Balancing'}
                </span>
              </div>
            </div>
          </div>

          {/* Distribution Table */}
          <div className="table-wrapper">
            <div className="table-header">
              <span className="table-title">Agent Lead Distribution</span>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Total Leads</th>
                  <th>New</th>
                  <th>Contacted</th>
                  <th>Qualified</th>
                  <th>Converted</th>
                  <th>Lost</th>
                  <th>% of Avg</th>
                </tr>
              </thead>
              <tbody>
                {data.distribution.map(item => {
                  const percentOfAvg = data.stats.averageLeadsPerAgent > 0 
                    ? Math.round((item.totalLeads / data.stats.averageLeadsPerAgent) * 100)
                    : 100;
                  
                  return (
                    <tr key={item.agent._id}>
                      <td>
                        <strong style={{ fontSize: 14 }}>{item.agent.name}</strong>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{item.agent.email}</div>
                      </td>
                      <td>
                        <strong style={{ fontSize: 15, color: 'var(--accent-primary)' }}>{item.totalLeads}</strong>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.statusBreakdown.New || 0}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.statusBreakdown.Contacted || 0}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.statusBreakdown.Qualified || 0}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.statusBreakdown.Converted || 0}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.statusBreakdown.Lost || 0}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ 
                            flex: 1, 
                            height: 8, 
                            background: 'var(--border-color)', 
                            borderRadius: 4,
                            overflow: 'hidden',
                            maxWidth: 100
                          }}>
                            <div style={{ 
                              width: `${Math.min(percentOfAvg, 150)}%`, 
                              height: '100%', 
                              background: percentOfAvg < 80 ? '#10b981' : percentOfAvg > 120 ? '#ef4444' : '#3b82f6',
                              transition: 'width 0.3s'
                            }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, minWidth: 40 }}>{percentOfAvg}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Info Box */}
          <div className="card" style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>📊 How Lead Distribution Works</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
              When new leads are created without manual assignment, the system automatically uses a <strong>round-robin algorithm</strong> 
              to assign them to the agent with the fewest leads.
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              This ensures an even distribution across your team. Agents with fewer than 80% of average are shown in green (underloaded), 
              while those with more than 120% are shown in red (overloaded).
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default LeadDistributionPage;
