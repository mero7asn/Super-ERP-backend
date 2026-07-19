import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { Icon } from '../components/Icons';

const statusBadge = (status) => {
  const map = { New: 'badge-new', Contacted: 'badge-contacted', Qualified: 'badge-qualified', Lost: 'badge-lost', Converted: 'badge-converted' };
  return map[status] || 'badge-new';
};
const sourceBadge = (src) => src === 'Meta' ? 'badge-meta' : src === 'Google' ? 'badge-google' : 'badge-new';

const STATUSES = ['New', 'Contacted', 'Qualified', 'Lost', 'Converted'];

const LeadsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [updating, setUpdating] = useState(null);

  const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(user?.role);
  const isManager = user?.role === 'Sales Manager';
  const isAgent = user?.role === 'Sales Agent';
  const canReassign = isAdmin || isManager;

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [leadsRes, agentsRes] = await Promise.all([
          API.get('/leads'),
          canReassign ? API.get('/leads/agents') : Promise.resolve({ data: { data: [] } }),
        ]);
        setLeads(leadsRes.data.data || []);
        setAgents(agentsRes.data.data || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load leads');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const updateLead = async (id, changes) => {
    setUpdating(id);
    try {
      const { data } = await API.put(`/leads/${id}`, changes);
      setLeads(prev => prev.map(l => l._id === id ? data.data : l));
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally {
      setUpdating(null);
    }
  };

  const filtered = leads.filter(l =>
    (filterStatus === 'All' || l.status === filterStatus) &&
    (l.name?.toLowerCase().includes(search.toLowerCase()) ||
     l.email?.toLowerCase().includes(search.toLowerCase()) ||
     l.source?.toLowerCase().includes(search.toLowerCase()) ||
     `${l.assignedTo?.firstName} ${l.assignedTo?.lastName}`.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="leads" size={26} style={{ color: 'var(--accent-primary)' }} />
            Leads
          </h1>
          <p className="page-subtitle">
            {isAdmin && 'All leads across all teams'}
            {isManager && 'Leads assigned to your team'}
            {isAgent && 'Your assigned leads'}
          </p>
        </div>
        {(isAdmin || isManager) && (
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={() => navigate('/leads/distribution')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/>
            </svg>
            View Distribution
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-wrapper">
        <div className="table-header">
          <span className="table-title">{filtered.length} Lead{filtered.length !== 1 ? 's' : ''}</span>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <select className="table-search" style={{ width: 150 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="All">All Statuses</option>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <input
              className="table-search"
              placeholder="Search leads…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading-state"><div className="spinner" />Loading leads…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Icon name="leads" size={48} style={{ opacity: 0.5 }} /></div>
            <p>No leads found</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Lead</th>
                <th>Source</th>
                <th>Status</th>
                {canReassign && <th>Assigned To</th>}
                {isAdmin && <th>Supervisor</th>}
                <th>Campaign</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => (
                <tr key={lead._id} style={{ opacity: updating === lead._id ? 0.6 : 1 }}>
                  <td>
                    <div>
                      <strong style={{ fontSize: 14 }}>{lead.name}</strong>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{lead.email}</div>
                      {lead.phone && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{lead.phone}</div>}
                    </div>
                  </td>
                  <td><span className={`badge ${sourceBadge(lead.source)}`}>{lead.source}</span></td>
                  <td>
                    {/* All roles can update status on leads they can see */}
                    <select
                      value={lead.status}
                      onChange={e => updateLead(lead._id, { status: e.target.value })}
                      disabled={updating === lead._id}
                      style={{
                        background: 'none', border: '1px solid var(--border-color)',
                        borderRadius: 20, padding: '3px 8px', fontSize: 11,
                        fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)',
                      }}
                    >
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  {canReassign && (
                    <td>
                      <select
                        value={lead.assignedTo?._id || lead.assignedTo || ''}
                        onChange={e => updateLead(lead._id, { assignedTo: e.target.value })}
                        disabled={updating === lead._id}
                        style={{
                          background: 'none', border: '1px solid var(--border-color)',
                          borderRadius: 6, padding: '4px 8px', fontSize: 12,
                          cursor: 'pointer', color: 'var(--text-primary)', maxWidth: 160,
                        }}
                      >
                        <option value="">Unassigned</option>
                        {agents.map(a => (
                          <option key={a._id} value={a._id}>
                            {a.firstName} {a.lastName}
                            {isAdmin && a.supervisor ? ` (${a.supervisor.firstName} ${a.supervisor.lastName})` : ''}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                  {isAdmin && (
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {lead.assignedTo?.supervisor
                        ? `${lead.assignedTo.supervisor.firstName} ${lead.assignedTo.supervisor.lastName}`
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                  )}
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {lead.campaign?.name
                      ? <span className="badge badge-new" style={{ fontSize: 10 }}>{lead.campaign.name}</span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate(`/leads/${lead._id}`)}
                      style={{ fontSize: 11, padding: '4px 10px' }}
                    >
                      👁️ View Lead
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default LeadsPage;
