import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';

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

const ALL_ROLES = [
  'Super CRM Administrator', 'Sales Agent', 'Sales Manager',
  'Customer Support Agent', 'Customer Support Manager',
  'Marketing Specialist', 'Marketing Manager', 'Business Analyst',
  'CRM Developer', 'CRM Consultant', 'System Architect', 'Executive User'
];

const permissionLabels = {
  canViewLeads: 'View Leads',
  canEditLeads: 'Edit Leads',
  canDeleteLeads: 'Delete Leads',
  canViewTickets: 'View Tickets',
  canEditTickets: 'Edit Tickets',
  canDeleteTickets: 'Delete Tickets',
  canManageCampaigns: 'Manage Campaigns',
  canManageUsers: 'Manage Users',
};

const UserProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, updateCurrentUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(currentUser?.role);
  const isOwnProfile = currentUser?._id === id;
  const canEdit = isOwnProfile || isAdmin;
  const [managers, setManagers] = useState([]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const [userRes, managersRes] = await Promise.all([
          API.get(`/auth/users/${id}`),
          isAdmin ? API.get('/auth/users') : Promise.resolve({ data: { data: [] } }),
        ]);
        setUser(userRes.data.data);
        setManagers((managersRes.data.data || []).filter(u => {
          const role = form.role || user?.role;
          
          // Team members report to their department manager
          if (role === 'Sales Agent') return u.role === 'Sales Manager';
          if (role === 'Customer Support Agent') return u.role === 'Customer Support Manager';
          if (role === 'Marketing Specialist') return u.role === 'Marketing Manager';
          if (role === 'CRM Developer' || role === 'CRM Consultant') return u.role === 'System Architect';
          
          // All managers report to Super CRM Administrator
          if (['Sales Manager', 'Customer Support Manager', 'Marketing Manager', 'System Architect'].includes(role))
            return u.role === 'Super CRM Administrator';
          
          // Super CRM Administrator and Business Analyst report to Executive User
          if (['Super CRM Administrator', 'Business Analyst'].includes(role))
            return u.role === 'Executive User';
          
          return false;
        }));
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load user');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id]);

  const startEditing = () => {
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      title: user.title || '',
      email: user.email,
      password: '',
      role: user.role,
      isActive: user.isActive,
      supervisor: user.supervisor?._id || user.supervisor || '',
      permissions: { ...user.permissions },
    });
    setSuccess('');
    setError('');
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        ...(form.password ? { password: form.password } : {}),
        ...(isAdmin ? { title: form.title, role: form.role, isActive: form.isActive, supervisor: form.supervisor || null, permissions: form.permissions } : {}),
      };
      const { data } = await API.put(`/auth/users/${id}`, payload);
      setUser(data.data);
      setEditing(false);
      setSuccess('Profile updated successfully.');
      if (isOwnProfile) {
        updateCurrentUser({
          firstName: data.data.firstName,
          lastName: data.data.lastName,
          email: data.data.email,
          role: data.data.role,
          isActive: data.data.isActive,
          permissions: data.data.permissions,
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-state"><div className="spinner" />Loading profile…</div>;
  if (!user) return null;

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  const enabledPerms = Object.entries(user.permissions || {}).filter(([, v]) => v).map(([k]) => k);

  return (
    <div>
      {/* Page header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/users')}
            className="sidebar-link"
            style={{ width: 'auto', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
            </svg>
            Back
          </button>
          <div>
            <h1 className="page-title">User Profile</h1>
            <p className="page-subtitle">Detailed view of user account and permissions</p>
          </div>
        </div>
        {canEdit && !editing && (
          <button className="btn btn-secondary btn-sm" onClick={startEditing} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit Profile
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Left card */}
        <div className="table-wrapper" style={{ padding: 24, textAlign: 'center' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 700, color: '#fff', margin: '0 auto 16px',
          }}>
            {initials}
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{user.firstName} {user.lastName}</h2>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 12 }}>{user.email}</div>
          <span className={`badge ${roleBadge(user.role)}`} style={{ fontSize: 12 }}>{user.role}</span>
          <div style={{ marginTop: 16 }}>
            <span className={`badge ${user.isActive ? 'badge-qualified' : 'badge-lost'}`}>
              {user.isActive ? 'Active' : 'Suspended'}
            </span>
          </div>
          <div style={{ marginTop: 20, fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
            {user.title && <div style={{ fontSize: 13, color: 'var(--accent-primary)', fontWeight: 600, marginBottom: 8 }}>{user.title}</div>}
            <div>Joined {new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div style={{ marginTop: 4 }}>Last updated {new Date(user.updatedAt).toLocaleDateString()}</div>
          </div>
        </div>

        {/* Right cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {editing ? (
            /* ── EDIT MODE ── */
            <>
              {/* Basic Info */}
              <div className="table-wrapper" style={{ padding: 24 }}>
                <div className="table-title" style={{ marginBottom: 20 }}>Edit Basic Info</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">First Name</label>
                    <input className="form-input" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Last Name</label>
                    <input className="form-input" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
                  </div>
                  {isAdmin && (
                    <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                      <label className="form-label">Title <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                      <input className="form-input" placeholder="e.g. Senior Sales Agent, Marketing Lead" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                    </div>
                  )}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Email Address</label>
                    <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">New Password <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(leave blank to keep)</span></label>
                    <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Admin-only fields */}
              {isAdmin && (
                <>
                  <div className="table-wrapper" style={{ padding: 24 }}>
                    <div className="table-title" style={{ marginBottom: 20 }}>Role & Status <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>Admin only</span></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Role</label>
                        <select className="form-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                          {ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Account Status</label>
                        <select className="form-input" value={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'true' }))}>
                          <option value="true">Active</option>
                          <option value="false">Suspended</option>
                        </select>
                      </div>
                    </div>
                    {(['Sales Agent', 'Customer Support Agent', 'Marketing Specialist', 'CRM Developer', 'CRM Consultant', 'Sales Manager', 'Customer Support Manager', 'Marketing Manager', 'System Architect', 'Super CRM Administrator', 'Business Analyst'].includes(form.role)) && (
                      <div className="form-group" style={{ margin: '16px 0 0' }}>
                        <label className="form-label">Supervisor</label>
                        <select className="form-input" value={form.supervisor} onChange={e => setForm(f => ({ ...f, supervisor: e.target.value }))}>
                          <option value="">— No Supervisor —</option>
                          {managers.map(m => (
                            <option key={m._id} value={m._id}>{m.firstName} {m.lastName} ({m.role})</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="table-wrapper" style={{ padding: 24 }}>
                    <div className="table-title" style={{ marginBottom: 16 }}>Permissions <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>Admin only</span></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {Object.entries(permissionLabels).map(([key, label]) => (
                        <label key={key} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                          background: form.permissions[key] ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${form.permissions[key] ? 'rgba(34,197,94,0.2)' : 'var(--border-color)'}`,
                          transition: 'all 0.15s',
                        }}>
                          <input
                            type="checkbox"
                            checked={!!form.permissions[key]}
                            onChange={e => setForm(f => ({ ...f, permissions: { ...f.permissions, [key]: e.target.checked } }))}
                            style={{ accentColor: '#22c55e', width: 15, height: 15 }}
                          />
                          <span style={{ fontSize: 13, color: form.permissions[key] ? 'var(--text-primary)' : 'var(--text-muted)' }}>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Save / Cancel */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving} style={{ width: 'auto' }}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </>
          ) : (
            /* ── VIEW MODE ── */
            <>
              <div className="table-wrapper" style={{ padding: 24 }}>
                <div className="table-title" style={{ marginBottom: 16 }}>Account Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {[
                    { label: 'First Name', value: user.firstName },
                    { label: 'Last Name', value: user.lastName },
                    ...(user.title ? [{ label: 'Title', value: user.title }] : []),
                    { label: 'Email Address', value: user.email },
                    { label: 'Role', value: user.role },
                    ...(user.role !== 'Executive User' ? [{ label: 'Supervisor', value: user.supervisor ? `${user.supervisor.firstName} ${user.supervisor.lastName} (${user.supervisor.role})` : '— None —' }] : []),
                    { label: 'Account Status', value: user.isActive ? 'Active' : 'Suspended' },
                    { label: 'User ID', value: user._id },
                  ].map(({ label, value }) => (
                    <div key={label} style={label === 'Title' ? { gridColumn: '1 / -1' } : {}}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 14, color: label === 'Title' ? 'var(--accent-primary)' : 'var(--text-primary)', wordBreak: 'break-all', fontWeight: label === 'Title' ? 600 : 400 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="table-wrapper" style={{ padding: 24 }}>
                <div className="table-title" style={{ marginBottom: 16 }}>Permissions</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {Object.keys(permissionLabels).map((key) => {
                    const granted = enabledPerms.includes(key);
                    return (
                      <div key={key} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 12px', borderRadius: 8,
                        background: granted ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${granted ? 'rgba(34,197,94,0.2)' : 'var(--border-color)'}`,
                      }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: granted ? '#22c55e' : 'var(--text-muted)',
                          flexShrink: 0,
                        }} />
                        <span style={{ fontSize: 13, color: granted ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {permissionLabels[key]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
