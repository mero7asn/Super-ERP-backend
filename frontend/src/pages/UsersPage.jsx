import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { Icon } from '../components/Icons';
import { DEPARTMENTS, getRolesByDepartment, getDepartmentByRole } from '../services/departmentJobs';
import { PERMISSION_CATALOG } from '../services/permissions';

// Short display labels for the most meaningful granted permissions (chips).
const CHIP_KEYS = [
  'leads.view.all', 'leads.edit.all', 'offers.send', 'offers.view.all',
  'tickets.view.all', 'tickets.assign', 'campaigns.create', 'analytics.view.executive',
  'users.permissions.edit', 'payroll.runs.release', 'hrm.schedules.edit', 'settings.edit',
];
const CHIP_LABELS = Object.fromEntries(
  PERMISSION_CATALOG.flatMap(g => g.items.map(i => [i.key, i.label]))
);

const roleBadge = (role) => {
  const map = {
    'Super CRM Administrator': 'badge-urgent',
    'System Architect': 'badge-urgent',
    'Sales Manager': 'badge-qualified',
    'Customer Support Manager': 'badge-qualified',
    'Marketing Manager': 'badge-qualified',
    'Sales Agent': 'badge-new',
    'Customer Support Agent': 'badge-new',
    'Marketing Specialist': 'badge-new',
    'Business Analyst': 'badge-contacted',
    'CRM Developer': 'badge-meta',
    'CRM Consultant': 'badge-meta',
    'Executive User': 'badge-converted'
  };
  return map[role] || 'badge-new';
};

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    title: '',
    email: '',
    password: '',
    roleName: 'Sales Agent'
  });
  const [selectedDept, setSelectedDept] = useState('Sales');
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      const { data } = await API.get('/auth/users');
      setUsers(data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async () => {
    setSaving(true);
    setError('');
    try {
      await API.post('/auth/register', newUser);
      await fetchUsers();
      setShowModal(false);
      setSelectedDept('Sales');
      setNewUser({ firstName: '', lastName: '', title: '', email: '', password: '', roleName: 'Sales Agent' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const filtered = users.filter(u =>
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icon name="users" size={26} style={{ color: 'var(--accent-primary)' }} />
            User Management
          </h1>
          <p className="page-subtitle">Configure system users, control roles, and review security permissions</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            className="table-search"
            placeholder="Search users…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>
            </svg>
            Create User
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-wrapper">
        <div className="table-header">
          <span className="table-title">
            {filtered.length} Registered User{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            Loading users…
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Icon name="users" size={48} style={{ opacity: 0.5 }} />
            </div>
            <p>No users found</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>User Details</th>
                <th>Role Designation</th>
                <th>Status</th>
                <th>Email (SMTP)</th>
                <th>Permissions Enabled</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => {
                const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
                const enabledPermissions = CHIP_KEYS
                  .filter(k => user.permissions && user.permissions[k])
                  .map(k => CHIP_LABELS[k] || k.replace('can', ''));

                return (
                  <tr key={user._id} onClick={() => navigate(`/users/${user._id}`)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
                        }}>
                          {initials}
                        </div>
                        <div>
                          <strong style={{ fontSize: 14 }}>{user.firstName} {user.lastName}</strong>
                          {user.title && <div style={{ fontSize: 11, color: 'var(--accent-primary)', marginTop: 2 }}>{user.title}</div>}
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${roleBadge(user.role)}`}>{user.role}</span>
                    </td>
                    <td>
                      <span className={`badge ${user.isActive ? 'badge-qualified' : 'badge-lost'}`}>
                        {user.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td>
                      {user.smtpUser ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="badge badge-qualified" style={{ fontSize: 10 }}>✓ Configured</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user.smtpUser}</span>
                        </div>
                      ) : (
                        <span className="badge badge-lost" style={{ fontSize: 10 }}>✗ Not Set</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 300 }}>
                        {enabledPermissions.length > 0 ? (
                          enabledPermissions.map(p => (
                            <span key={p} className="badge badge-new" style={{ fontSize: 10, textTransform: 'none', padding: '2px 6px' }}>
                              {p}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Read-Only Access</span>
                        )}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 12, padding: 32, maxWidth: 500, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Create New User</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Add a new team member to the CRM system</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">First Name</label>
                  <input className="form-input" value={newUser.firstName} onChange={e => setNewUser(p => ({ ...p, firstName: e.target.value }))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Last Name</label>
                  <input className="form-input" value={newUser.lastName} onChange={e => setNewUser(p => ({ ...p, lastName: e.target.value }))} />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Title</label>
                <input className="form-input" placeholder="e.g. Senior Sales Agent, Marketing Lead" value={newUser.title} onChange={e => setNewUser(p => ({ ...p, title: e.target.value }))} />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Email Address</label>
                <input className="form-input" type="email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Password</label>
                <input className="form-input" type="password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Department</label>
                <select
                  className="form-input"
                  value={selectedDept}
                  onChange={e => {
                    const dept = e.target.value;
                    setSelectedDept(dept);
                    const roles = getRolesByDepartment(dept);
                    setNewUser(p => ({ ...p, roleName: roles[0] || '' }));
                  }}
                >
                  {DEPARTMENTS.map(d => (
                    <option key={d.id} value={d.id}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Job / Role</label>
                <select className="form-input" value={newUser.roleName} onChange={e => setNewUser(p => ({ ...p, roleName: e.target.value }))}>
                  {getRolesByDepartment(selectedDept).map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleCreateUser} disabled={saving}>
                {saving ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
