import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { Icon } from '../components/Icons';

const AFFECTED_PAGES = [
  'Other',
  'Dashboard',
  'Leads',
  'Lead Distribution',
  'Sales Dashboard',
  'Offers',
  'Bookings',
  'Campaigns',
  'Analytics',
  'Executive Dashboard',
  'Teams',
  'User Management',
  'User Profile',
  'Settings',
  'CRM Dev Tools'
];

const userName = (person) => person ? `${person.firstName} ${person.lastName}` : 'System';
const sameId = (left, right) => Boolean(left && right && left.toString() === right.toString());
const formatDate = (value) => value ? new Date(value).toLocaleString() : '—';

const TicketsPage = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [technologyUsers, setTechnologyUsers] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [commentSaving, setCommentSaving] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    affectedPage: 'Other',
    priority: 'Medium',
    assignedTo: ''
  });

  const canManage = ['CRM Developer', 'CRM Consultant', 'System Architect', 'Super CRM Administrator'].includes(user?.role);
  const canCreate = Boolean(user);
  const canComment = Boolean(
    selectedTicket &&
    (
      canManage ||
      sameId(selectedTicket.assignedTo?._id, user?._id) ||
      sameId(selectedTicket.createdBy?._id, user?._id)
    )
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ticketsRes, technologyUsersRes] = await Promise.all([
          API.get('/tickets'),
          canManage ? API.get('/tickets/technology-users') : Promise.resolve({ data: { data: [] } })
        ]);
        setTickets(ticketsRes.data.data || []);
        setTechnologyUsers(technologyUsersRes.data.data || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [canManage]);

  const refreshTickets = async () => {
    const { data } = await API.get('/tickets');
    setTickets(data.data || []);
  };

  const openTicket = async (id) => {
    try {
      const { data } = await API.get(`/tickets/${id}`);
      setSelectedTicket(data.data);
      setShowDetailsModal(true);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load ticket details');
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = { ...newTicket };
      if (!canManage) {
        delete payload.assignedTo;
        delete payload.priority;
      }
      await API.post('/tickets', payload);
      await refreshTickets();
      setShowModal(false);
      setNewTicket({ subject: '', description: '', affectedPage: 'Other', priority: 'Medium', assignedTo: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create ticket');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id, changes) => {
    setUpdating(id);
    try {
      await API.put(`/tickets/${id}`, changes);
      await refreshTickets();
      if (selectedTicket?._id === id) {
        const { data } = await API.get(`/tickets/${id}`);
        setSelectedTicket(data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update ticket');
    } finally {
      setUpdating(null);
    }
  };

  const handleAddComment = async () => {
    if (!selectedTicket || !newComment.trim()) return;

    setCommentSaving(true);
    setError('');
    try {
      await API.post(`/tickets/${selectedTicket._id}/comments`, { text: newComment.trim() });
      const { data } = await API.get(`/tickets/${selectedTicket._id}`);
      setSelectedTicket(data.data);
      setNewComment('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add comment');
    } finally {
      setCommentSaving(false);
    }
  };

  const filtered = tickets.filter(t =>
    t.subject?.toLowerCase().includes(search.toLowerCase()) ||
    t.status?.toLowerCase().includes(search.toLowerCase()) ||
    t.priority?.toLowerCase().includes(search.toLowerCase()) ||
    t.affectedPage?.toLowerCase().includes(search.toLowerCase()) ||
    t.requesterTeam?.toLowerCase().includes(search.toLowerCase()) ||
    t.createdBy?.role?.toLowerCase().includes(search.toLowerCase()) ||
    t.createdBy?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
    t.createdBy?.lastName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icon name="tickets" size={26} style={{ color: 'var(--accent-primary)' }} />
            Technical Issues
          </h1>
          <p className="page-subtitle">
            {canManage ? 'Viewing all technical issues reported to the Technology team' : 'Report and track technical issues submitted to the Technology team'}
          </p>
        </div>
        {canCreate && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/><path d="M12 5v14"/>
            </svg>
            Report Issue
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-wrapper">
        <div className="table-header">
          <span className="table-title">
            {filtered.length} Issue{filtered.length !== 1 ? 's' : ''}
          </span>
          <input
            className="table-search"
            placeholder="Search by subject, status, priority, requester…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            Loading issues…
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Icon name="tickets" size={48} style={{ opacity: 0.5 }} />
            </div>
            <p>No issues found</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Affected Page</th>
                <th>Reporting Team</th>
                <th>Assigned To</th>
                <th>Created</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ticket => (
                <tr key={ticket._id} style={{ opacity: updating === ticket._id ? 0.6 : 1 }}>
                  <td>
                    <strong>{ticket.subject}</strong>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{ticket.description}</div>
                  </td>
                  <td>
                    <select
                      value={ticket.priority}
                      onChange={e => handleUpdate(ticket._id, { priority: e.target.value })}
                      disabled={updating === ticket._id || !canManage}
                      style={{
                        background: 'none', border: '1px solid var(--border-color)',
                        borderRadius: 20, padding: '3px 8px', fontSize: 11,
                        fontWeight: 600, cursor: canManage ? 'pointer' : 'default', color: 'var(--text-primary)',
                      }}
                    >
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                      <option>Urgent</option>
                    </select>
                  </td>
                  <td>
                    <select
                      value={ticket.status}
                      onChange={e => handleUpdate(ticket._id, { status: e.target.value })}
                      disabled={updating === ticket._id || !canManage}
                      style={{
                        background: 'none', border: '1px solid var(--border-color)',
                        borderRadius: 20, padding: '3px 8px', fontSize: 11,
                        fontWeight: 600, cursor: canManage ? 'pointer' : 'default', color: 'var(--text-primary)',
                      }}
                    >
                      <option>Open</option>
                      <option>In Progress</option>
                      <option>Resolved</option>
                      <option>Closed</option>
                    </select>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                    {ticket.affectedPage || 'Other'}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                    {ticket.requesterTeam || ticket.createdBy?.role || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                    {ticket.assignedTo
                      ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
                      : <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => openTicket(ticket._id)}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 12, padding: 32, maxWidth: 600, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Report Technical Issue</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Submit a system technical issue to the Technology team</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Subject</label>
                <input className="form-input" placeholder="Brief description of the issue" value={newTicket.subject} onChange={e => setNewTicket(p => ({ ...p, subject: e.target.value }))} />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Description</label>
                <textarea className="form-input" rows="4" placeholder="Detailed description of the technical issue..." value={newTicket.description} onChange={e => setNewTicket(p => ({ ...p, description: e.target.value }))} />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Affected Page</label>
                <select className="form-input" value={newTicket.affectedPage} onChange={e => setNewTicket(p => ({ ...p, affectedPage: e.target.value }))}>
                  {AFFECTED_PAGES.map(page => (
                    <option key={page}>{page}</option>
                  ))}
                </select>
              </div>

              {!canManage && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Technology team will set the priority after reviewing the issue.
                </div>
              )}

              {canManage && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Priority</label>
                  <select className="form-input" value={newTicket.priority} onChange={e => setNewTicket(p => ({ ...p, priority: e.target.value }))}>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Urgent</option>
                  </select>
                </div>
              )}

              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Reporting team: <strong>{user?.role || 'Unknown'}</strong>
              </div>

              {canManage && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Assign To</label>
                  <select className="form-input" value={newTicket.assignedTo} onChange={e => setNewTicket(p => ({ ...p, assignedTo: e.target.value }))}>
                    <option value="">Unassigned</option>
                    {technologyUsers.map(agent => (
                      <option key={agent._id} value={agent._id}>{agent.firstName} {agent.lastName} ({agent.role})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={saving}>
                {saving ? 'Creating...' : 'Report Issue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailsModal && selectedTicket && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20
        }} onClick={() => setShowDetailsModal(false)}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 12, padding: 32, maxWidth: 760, width: '100%', maxHeight: '90vh', overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{selectedTicket.subject}</h2>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {selectedTicket.affectedPage || 'Other'} · {selectedTicket.status} · {selectedTicket.priority}
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowDetailsModal(false)}>Close</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginBottom: 24 }}>
              <div style={{ padding: 14, borderRadius: 10, background: 'rgba(37, 99, 235, 0.06)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Description</div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{selectedTicket.description}</div>
              </div>
              <div style={{ padding: 14, borderRadius: 10, background: 'rgba(37, 99, 235, 0.06)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Submitted By</div>
                <div>{userName(selectedTicket.createdBy)} · {selectedTicket.createdBy?.role || selectedTicket.requesterTeam}</div>
              </div>
              <div style={{ padding: 14, borderRadius: 10, background: 'rgba(37, 99, 235, 0.06)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Assigned To</div>
                <div>{selectedTicket.assignedTo ? userName(selectedTicket.assignedTo) : 'Unassigned'}</div>
              </div>
              <div style={{ padding: 14, borderRadius: 10, background: 'rgba(37, 99, 235, 0.06)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Target Team</div>
                <div>{selectedTicket.targetTeam || 'Technology Team'}</div>
              </div>
              <div style={{ padding: 14, borderRadius: 10, background: 'rgba(37, 99, 235, 0.06)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Created</div>
                <div>{formatDate(selectedTicket.createdAt)}</div>
              </div>
              <div style={{ padding: 14, borderRadius: 10, background: 'rgba(37, 99, 235, 0.06)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Updated</div>
                <div>{formatDate(selectedTicket.updatedAt)}</div>
              </div>
            </div>

            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Comments</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {(selectedTicket.comments || []).length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No comments yet.</div>
              )}
              {(selectedTicket.comments || []).map(comment => (
                <div key={comment._id} style={{ padding: 12, borderRadius: 10, background: 'rgba(15, 23, 42, 0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                    <strong style={{ fontSize: 13 }}>{userName(comment.author)}</strong>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(comment.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{comment.text}</div>
                </div>
              ))}
            </div>

            {canComment && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <textarea
                  className="form-input"
                  rows="3"
                  placeholder="Add an internal note or update…"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary btn-sm" onClick={handleAddComment} disabled={commentSaving || !newComment.trim()}>
                  {commentSaving ? 'Adding...' : 'Add Comment'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketsPage;
