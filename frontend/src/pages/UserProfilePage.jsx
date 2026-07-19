import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { PERMISSION_CATALOG, ALL_PERMISSION_KEYS } from '../services/permissions';

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

// Normalize a user's stored permissions into a full catalog-backed map.
const normalizePermissions = (stored = {}) => {
  const base = {};
  ALL_PERMISSION_KEYS.forEach(k => { base[k] = false; });
  if (stored && typeof stored === 'object') {
    Object.entries(stored).forEach(([k, v]) => {
      if (k in base) base[k] = !!v;
      else base[k] = !!v; // keep custom keys too
    });
  }
  return base;
};

// Reusable permission matrix (categorized, with per-group select-all + filter).
const PermissionMatrix = ({ value, onChange, readOnly = false, filter = '' }) => {
  const q = filter.trim().toLowerCase();
  const groups = useMemo(
    () => PERMISSION_CATALOG
      .map(g => ({
        ...g,
        items: g.items.filter(i => !q || i.label.toLowerCase().includes(q) || i.key.toLowerCase().includes(q)),
      }))
      .filter(g => g.items.length > 0),
    [filter]
  );

  if (groups.length === 0) {
    return <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: 12 }}>No permissions match “{filter}”.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {groups.map(g => {
        const granted = g.items.filter(i => value[i.key]).length;
        const allOn = granted === g.items.length;
        const toggleGroup = () => {
          if (readOnly) return;
          const next = { ...value };
          g.items.forEach(i => { next[i.key] = !allOn; });
          onChange(next);
        };
        return (
          <div key={g.group}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--border-color)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{g.group}</span>
                <span className="badge badge-new" style={{ fontSize: 10 }}>{granted}/{g.items.length}</span>
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={toggleGroup}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: 11, padding: '4px 10px' }}
                >
                  {allOn ? 'Clear all' : 'Select all'}
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
              {g.items.map(i => {
                const checked = !!value[i.key];
                const label = (
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 8, cursor: readOnly ? 'default' : 'pointer',
                    background: checked ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${checked ? 'rgba(34,197,94,0.25)' : 'var(--border-color)'}`,
                  }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={readOnly}
                      onChange={e => {
                        if (readOnly) return;
                        onChange({ ...value, [i.key]: e.target.checked });
                      }}
                      style={{ accentColor: '#22c55e', width: 15, height: 15, flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 13, color: checked ? 'var(--text-primary)' : 'var(--text-muted)' }}>{i.label}</span>
                  </label>
                );
                return <div key={i.key}>{label}</div>;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
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
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState(null);
  const [permFilter, setPermFilter] = useState('');

  const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(currentUser?.role);
  const isOwnProfile = currentUser?._id === id;
  const canEdit = isOwnProfile || isAdmin;
  const [managers, setManagers] = useState([]);

  const PROVIDER_PRESETS = {
    custom: { label: 'Custom / Other', host: '', port: 587, secure: false },
    gmail: { label: 'Gmail / Google Workspace', host: 'smtp.gmail.com', port: 465, secure: true },
    outlook: { label: 'Outlook / Microsoft 365', host: 'smtp.office365.com', port: 587, secure: false },
  };

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
    let smtpProvider = 'custom';
    const host = user.smtpHost || '';
    if (host === 'smtp.gmail.com') smtpProvider = 'gmail';
    else if (host === 'smtp.office365.com') smtpProvider = 'outlook';
    
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      title: user.title || '',
      email: user.email,
      password: '',
      role: user.role,
      isActive: user.isActive,
      supervisor: user.supervisor?._id || user.supervisor || '',
      permissions: normalizePermissions(user.permissions),
      smtpHost: user.smtpHost || '',
      smtpPort: user.smtpPort || 587,
      smtpSecure: user.smtpSecure || false,
      smtpUser: user.smtpUser || '',
      smtpPass: '',
      smtpProvider,
    });
    setSuccess('');
    setError('');
    setSmtpTestResult(null);
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
        smtpHost: form.smtpHost || null,
        smtpPort: form.smtpPort,
        smtpSecure: form.smtpSecure,
        smtpUser: form.smtpUser || null,
        ...(form.smtpPass ? { smtpPass: form.smtpPass } : {}),
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
          smtpHost: data.data.smtpHost,
          smtpPort: data.data.smtpPort,
          smtpSecure: data.data.smtpSecure,
          smtpUser: data.data.smtpUser,
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

              {/* SMTP Settings */}
              <div className="table-wrapper" style={{ padding: 24 }}>
                <div className="table-title" style={{ marginBottom: 20 }}>
                  Email Sending Settings (SMTP)
                  {!isOwnProfile && isAdmin && (
                    <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--accent-primary)', marginLeft: 8 }}>
                      Admin: Configuring {user?.firstName}'s email
                    </span>
                  )}
                </div>
                {/* Sender email info banner */}
                {user?.smtpUser && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(var(--accent-rgb, 99,102,241),0.08)', borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
                    <span style={{ fontSize: 16 }}>📤</span>
                    <span>Offers will be sent <strong>from</strong>: <strong style={{ color: 'var(--accent-primary)' }}>{user.smtpUser}</strong></span>
                  </div>
                )}
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  {isOwnProfile
                    ? 'The sender address on outgoing offer emails will be your SMTP email below — not your CRM login email.'
                    : `Configure ${user?.firstName} ${user?.lastName}'s SMTP so they can send offer emails directly from their account. Use their personal Gmail App Password or company SMTP credentials.`}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                    <label className="form-label">Provider Preset</label>
                    <select
                      className="form-input"
                      value={(() => {
                        const entry = Object.entries(PROVIDER_PRESETS).find(([, p]) => p.host === form.smtpHost && p.port === form.smtpPort);
                        return entry ? entry[0] : 'custom';
                      })()}
                      onChange={(e) => {
                        const preset = PROVIDER_PRESETS[e.target.value];
                        setForm(f => ({ ...f, smtpHost: preset.host, smtpPort: preset.port, smtpSecure: preset.secure }));
                      }}
                    >
                      {Object.entries(PROVIDER_PRESETS).map(([key, preset]) => (
                        <option key={key} value={key}>{preset.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">SMTP Host</label>
                    <input className="form-input" placeholder="smtp.gmail.com" value={form.smtpHost} onChange={e => setForm(f => ({ ...f, smtpHost: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">SMTP Port</label>
                    <input className="form-input" type="number" placeholder="587" value={form.smtpPort} onChange={e => setForm(f => ({ ...f, smtpPort: parseInt(e.target.value) || 587 }))} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">SMTP Username / Email</label>
                    <input className="form-input" type="email" placeholder="you@gmail.com" value={form.smtpUser} onChange={e => setForm(f => ({ ...f, smtpUser: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">SMTP Password / App Password</label>
                    <input
                      className="form-input"
                      type="password"
                      placeholder={user?.smtpUser ? '🔒 Password saved — enter new one to change' : 'App password or SMTP password'}
                      value={form.smtpPass}
                      onChange={e => setForm(f => ({ ...f, smtpPass: e.target.value }))}
                    />
                    <div style={{ fontSize: 11, color: user?.smtpUser ? 'var(--accent-primary)' : 'var(--text-muted)', marginTop: 4 }}>
                      {user?.smtpUser
                        ? '✓ A password is already saved. Leave blank to keep it, or type a new one to update.'
                        : 'Enter your App Password (Gmail/Outlook) or SMTP password. It will be encrypted and stored securely.'}
                    </div>
                  </div>
                  <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                      type="checkbox"
                      id="smtpSecure"
                      checked={form.smtpSecure}
                      onChange={e => setForm(f => ({ ...f, smtpSecure: e.target.checked }))}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                    <label htmlFor="smtpSecure" style={{ fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
                      Use SSL/TLS (port 465). Uncheck for STARTTLS (port 587).
                    </label>
                  </div>
                </div>

                {/* Test Connection Button */}
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={smtpTesting || (!form.smtpHost && !user?.smtpUser)}
                    onClick={async () => {
                      setSmtpTesting(true);
                      setSmtpTestResult(null);
                      try {
                        // Send current form values so test works even before saving
                        const testPayload = {};
                        if (form.smtpHost) testPayload.smtpHost = form.smtpHost;
                        if (form.smtpPort) testPayload.smtpPort = form.smtpPort;
                        if (form.smtpSecure !== undefined) testPayload.smtpSecure = form.smtpSecure;
                        if (form.smtpUser) testPayload.smtpUser = form.smtpUser;
                        if (form.smtpPass) testPayload.smtpPass = form.smtpPass;
                        const { data } = await API.post(`/auth/users/${id}/verify-smtp`, testPayload);
                        setSmtpTestResult({ success: data.success, message: data.message });
                      } catch (err) {
                        setSmtpTestResult({ success: false, message: err.response?.data?.message || 'Connection failed' });
                      } finally {
                        setSmtpTesting(false);
                      }
                    }}
                  >
                    {smtpTesting ? '⏳ Testing...' : '🔌 Test Connection'}
                  </button>
                  {!form.smtpHost && !user?.smtpUser && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Fill in your SMTP settings above to test.</span>
                  )}
                  {smtpTestResult && (
                    <span style={{
                      fontSize: 13, fontWeight: 600,
                      color: smtpTestResult.success ? 'var(--status-won, #22c55e)' : 'var(--status-lost, #ef4444)'
                    }}>
                      {smtpTestResult.success ? '✅' : '❌'} {smtpTestResult.message}
                    </span>
                  )}
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
                    <div className="table-title" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <span>Access Permissions <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>Admin only — grant specific access, not just a role</span></span>
                    </div>
                    <input
                      className="table-search"
                      placeholder="Filter permissions…"
                      value={permFilter}
                      onChange={e => setPermFilter(e.target.value)}
                      style={{ marginBottom: 16, maxWidth: 320 }}
                    />
                    <PermissionMatrix
                      value={form.permissions}
                      onChange={next => setForm(f => ({ ...f, permissions: next }))}
                    />
                    <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)' }}>
                      {ALL_PERMISSION_KEYS.filter(k => form.permissions[k]).length} of {ALL_PERMISSION_KEYS.length} specific permissions granted.
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
                <div className="table-title" style={{ marginBottom: 12 }}>Access Permissions</div>
                <PermissionMatrix value={normalizePermissions(user.permissions)} readOnly />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
