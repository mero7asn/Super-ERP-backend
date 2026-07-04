import { useState, useEffect, useCallback } from 'react';
import API from '../services/api';
import { Icon } from '../components/Icons';

const PRIORITY_ORDER = { Urgent: 0, High: 1, Medium: 2, Low: 3 };

const priorityColor = {
  Urgent: '#ef4444', High: '#f59e0b', Medium: '#06b6d4', Low: '#22c55e'
};

const statusColor = {
  'Open': '#4f6ef7',
  'In Progress': '#06b6d4',
  'Resolved': '#22c55e',
  'Closed': '#64748b',
};

// Resolution timer: ticks every second
const useElapsed = (createdAt) => {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    const calc = () => {
      const diff = Math.floor((Date.now() - new Date(createdAt)) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsed(`${h}h ${m}m ${s}s`);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [createdAt]);
  return elapsed;
};

const TicketRow = ({ ticket, onStatusChange }) => {
  const elapsed = useElapsed(ticket.createdAt);
  const isUrgent = ticket.priority === 'Urgent';
  const isOpen = ticket.status === 'Open' || ticket.status === 'In Progress';

  return (
    <tr style={isUrgent && isOpen ? { background: 'rgba(239,68,68,0.04)' } : {}}>
      <td>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{ticket.subject}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
          {ticket.description?.slice(0, 60)}{ticket.description?.length > 60 ? '…' : ''}
        </div>
      </td>
      <td>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 10px', borderRadius: 20,
          fontSize: 11, fontWeight: 700,
          background: `${priorityColor[ticket.priority]}18`,
          color: priorityColor[ticket.priority],
        }}>
          {ticket.priority === 'Urgent' && <Icon name="alert" size={12} style={{ color: '#ef4444' }} />}
          {ticket.priority}
        </span>
      </td>
      <td>
        <select
          value={ticket.status}
          onChange={e => onStatusChange(ticket._id, e.target.value)}
          style={{
            background: `${statusColor[ticket.status]}18`,
            color: statusColor[ticket.status],
            border: `1px solid ${statusColor[ticket.status]}44`,
            borderRadius: 20,
            padding: '3px 10px',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        >
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
          <option value="Closed">Closed</option>
        </select>
      </td>
      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
        {ticket.affectedPage || 'Other'}
      </td>
      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
        {ticket.requesterTeam || ticket.createdBy?.role || '—'}
      </td>
      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
        {ticket.assignedTo
          ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
          : <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}
      </td>
      <td>
        {isOpen ? (
          <span style={{
            fontFamily: 'monospace',
            fontSize: 12,
            color: isUrgent ? '#ef4444' : 'var(--accent-info)',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4
          }}>
            <Icon name="clock" size={12} />
            {elapsed}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
        )}
      </td>
    </tr>
  );
};

const SupportTicketsPage = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  useEffect(() => {
    API.get('/tickets')
      .then(({ data }) => setTickets(data.data || []))
      .catch(err => setError(err.response?.data?.message || 'Failed to load tickets'))
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = useCallback(async (id, status) => {
    setTickets(prev =>
      prev.map(t => (t._id === id ? { ...t, status } : t))
    );
    try {
      await API.put(`/tickets/${id}`, { status });
    } catch { /* revert in production */ }
  }, []);

  const filtered = tickets
    .filter(t =>
      (filterPriority === 'All' || t.priority === filterPriority) &&
      (filterStatus === 'All' || t.status === filterStatus) &&
        (!search ||
        t.subject?.toLowerCase().includes(search.toLowerCase()) ||
        t.affectedPage?.toLowerCase().includes(search.toLowerCase()) ||
        t.requesterTeam?.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) =>
      (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4)
    );

  const openCount  = tickets.filter(t => t.status === 'Open').length;
  const urgentCount = tickets.filter(t => t.priority === 'Urgent' && t.status !== 'Resolved' && t.status !== 'Closed').length;
  const resolvedCount = tickets.filter(t => t.status === 'Resolved').length;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icon name="support" size={26} style={{ color: 'var(--accent-primary)' }} />
          Technical Issues
        </h1>
        <p className="page-subtitle">View technical issues reported by internal teams to the Technology team</p>
      </div>

      {/* KPI row */}
      <div className="stat-grid" style={{ marginBottom: 28 }}>
        <div className="stat-card blue">
          <div className="stat-icon" style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
            <Icon name="ticket" size={24} />
          </div>
          <div className="stat-value">{tickets.length}</div>
          <div className="stat-label">Total Tickets</div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-icon" style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
            <Icon name="unlock" size={24} />
          </div>
          <div className="stat-value">{openCount}</div>
          <div className="stat-label">Open</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon" style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
            <Icon name="alert" size={24} />
          </div>
          <div className="stat-value">{urgentCount}</div>
          <div className="stat-label">Urgent Active</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon" style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
            <Icon name="check" size={24} />
          </div>
          <div className="stat-value">{resolvedCount}</div>
          <div className="stat-label">Resolved</div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-wrapper">
        <div className="table-header">
          <span className="table-title">{filtered.length} Ticket{filtered.length !== 1 ? 's' : ''}</span>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              className="table-search"
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              style={{ width: 130 }}
            >
              <option value="All">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <select
              className="table-search"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{ width: 140 }}
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
            <input
              className="table-search"
              placeholder="Search subject or customer…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading-state"><div className="spinner" />Loading tickets…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Icon name="ticket" size={48} style={{ opacity: 0.5 }} />
            </div>
            <p>No tickets match your filters</p>
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
                <th>Timer</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ticket => (
                <TicketRow key={ticket._id} ticket={ticket} onStatusChange={handleStatusChange} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default SupportTicketsPage;
