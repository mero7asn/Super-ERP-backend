import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { Icon } from '../components/Icons';

const platformBadge = (platform) => {
  const map = { Meta: 'badge-meta', Google: 'badge-google', Email: 'badge-new', Other: 'badge-contacted' };
  return map[platform] || 'badge-new';
};

const statusBadge = (status) => {
  const map = { Active: 'badge-qualified', Draft: 'badge-closed', Paused: 'badge-high', Completed: 'badge-resolved' };
  return map[status] || 'badge-new';
};

const EMPTY_FORM = { name: '', platform: 'Meta', status: 'Draft', budget: '', startDate: '', endDate: '' };

const CampaignsPage = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [copied, setCopied] = useState(null);

  const canCreate = ['Super CRM Administrator', 'Marketing Specialist', 'Marketing Manager', 'System Architect'].includes(user?.role);
  const canDelete = ['Super CRM Administrator', 'Marketing Manager', 'System Architect'].includes(user?.role);
  const canGetFormLink = ['Super CRM Administrator', 'System Architect', 'Marketing Manager'].includes(user?.role);

  const handleGetFormLink = async (campaign) => {
    try {
      const { data } = await API.post(`/public/campaigns/${campaign._id}/generate-form`);
      const link = `${window.location.origin}/form/${data.formSlug}`;
      await navigator.clipboard.writeText(link);
      setCopied(campaign._id);
      setTimeout(() => setCopied(null), 2500);
      setCampaigns(prev => prev.map(c => c._id === campaign._id ? { ...c, formSlug: data.formSlug } : c));
    } catch {
      setError('Failed to generate form link');
    }
  };

  const fetchCampaigns = async () => {
    try {
      const { data } = await API.get('/campaigns');
      setCampaigns(data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const filtered = campaigns.filter(c =>
    (filterStatus === 'All' || c.status === filterStatus) &&
    (c.name?.toLowerCase().includes(search.toLowerCase()) ||
     c.platform?.toLowerCase().includes(search.toLowerCase()))
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (campaign) => {
    setEditingId(campaign._id);
    setForm({
      name: campaign.name || '',
      platform: campaign.platform || 'Meta',
      status: campaign.status || 'Draft',
      budget: campaign.budget || '',
      startDate: campaign.startDate ? campaign.startDate.slice(0, 10) : '',
      endDate: campaign.endDate ? campaign.endDate.slice(0, 10) : '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (editingId) {
        const { data } = await API.put(`/campaigns/${editingId}`, form);
        setCampaigns(prev => prev.map(c => c._id === editingId ? data.data : c));
      } else {
        const { data } = await API.post('/campaigns', form);
        setCampaigns(prev => [data.data, ...prev]);
      }
      setShowModal(false);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save campaign');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this campaign? This cannot be undone.')) return;
    try {
      await API.delete(`/campaigns/${id}`);
      setCampaigns(prev => prev.filter(c => c._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete campaign');
    }
  };

  // Summary stats
  const totalBudget = campaigns.reduce((sum, c) => sum + (c.budget || 0), 0);
  const activeCampaigns = campaigns.filter(c => c.status === 'Active').length;
  const draftCampaigns = campaigns.filter(c => c.status === 'Draft').length;
  const completedCampaigns = campaigns.filter(c => c.status === 'Completed').length;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icon name="campaigns" size={26} style={{ color: 'var(--accent-primary)' }} />
            Campaigns
          </h1>
          <p className="page-subtitle">Plan, track, and manage marketing campaigns across platforms</p>
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={openCreate} style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="plus" size={16} />
            New Campaign
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* KPI Cards */}
      <div className="stat-grid" style={{ marginBottom: 28 }}>
        <div className="stat-card blue">
          <div className="stat-icon" style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
            <Icon name="campaigns" size={24} />
          </div>
          <div className="stat-value">{campaigns.length}</div>
          <div className="stat-label">Total Campaigns</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon" style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
            <Icon name="play" size={24} />
          </div>
          <div className="stat-value">{activeCampaigns}</div>
          <div className="stat-label">Active Now</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-icon" style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
            <Icon name="edit" size={24} />
          </div>
          <div className="stat-value">{draftCampaigns}</div>
          <div className="stat-label">In Draft</div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-icon" style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
            <Icon name="check" size={24} />
          </div>
          <div className="stat-value">{completedCampaigns}</div>
          <div className="stat-label">Completed</div>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <div className="table-header">
          <span className="table-title">{filtered.length} Campaign{filtered.length !== 1 ? 's' : ''}</span>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              className="table-search"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{ width: 140 }}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Draft">Draft</option>
              <option value="Paused">Paused</option>
              <option value="Completed">Completed</option>
            </select>
            <input
              className="table-search"
              placeholder="Search campaigns…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading-state"><div className="spinner" />Loading campaigns…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Icon name="campaigns" size={48} style={{ opacity: 0.4 }} /></div>
            <p>No campaigns found</p>
            {canCreate && (
              <button className="btn btn-primary" onClick={openCreate} style={{ width: 'auto', marginTop: 12 }}>
                Create First Campaign
              </button>
            )}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Campaign Name</th>
                <th>Platform</th>
                <th>Status</th>
                <th>Budget</th>
                <th>Duration</th>
                <th>Manager</th>
                {canGetFormLink && <th>Form Link</th>}
                {(canCreate || canDelete) && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(campaign => (
                <tr key={campaign._id}>
                  <td><strong>{campaign.name}</strong></td>
                  <td><span className={`badge ${platformBadge(campaign.platform)}`}>{campaign.platform}</span></td>
                  <td><span className={`badge ${statusBadge(campaign.status)}`}>{campaign.status}</span></td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    ${Number(campaign.budget || 0).toLocaleString()}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {campaign.startDate ? new Date(campaign.startDate).toLocaleDateString() : '—'}
                    {campaign.startDate && campaign.endDate ? ' → ' : ''}
                    {campaign.endDate ? new Date(campaign.endDate).toLocaleDateString() : ''}
                    {!campaign.startDate && !campaign.endDate && '—'}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {campaign.manager
                      ? `${campaign.manager.firstName} ${campaign.manager.lastName}`
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  {canGetFormLink && (
                    <td>
                      <button
                        onClick={() => handleGetFormLink(campaign)}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}
                      >
                        {copied === campaign._id ? (
                          <><Icon name="check" size={13} /> Copied!</>
                        ) : (
                          <><Icon name="globe" size={13} /> {campaign.formSlug ? 'Copy Link' : 'Get Form Link'}</>
                        )}
                      </button>
                    </td>
                  )}
                  {(canCreate || canDelete) && (
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {canCreate && (
                          <button
                            onClick={() => openEdit(campaign)}
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <Icon name="edit" size={13} />
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(campaign._id)}
                            className="btn btn-danger btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <Icon name="trash" size={13} />
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Budget Footer */}
        {!loading && campaigns.length > 0 && (
          <div style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'flex-end',
            fontSize: 13,
            color: 'var(--text-secondary)',
            background: 'var(--bg-secondary)'
          }}>
            <span>Total allocated budget: <strong style={{ color: 'var(--text-primary)' }}>${totalBudget.toLocaleString()}</strong></span>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }} onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="card" style={{ width: '100%', maxWidth: 520, padding: 36, position: 'relative' }}>
            {/* Close */}
            <button
              onClick={() => setShowModal(false)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
            >
              <Icon name="close" size={18} />
            </button>

            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="campaigns" size={20} style={{ color: 'var(--accent-primary)' }} />
              {editingId ? 'Edit Campaign' : 'Create Campaign'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>
              {editingId ? 'Update campaign details below.' : 'Fill in the details to launch a new campaign.'}
            </p>

            {formError && <div className="alert alert-error">{formError}</div>}

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Campaign Name</label>
                <input
                  className="form-input"
                  placeholder="e.g. Summer Sale Q3 2026"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Platform</label>
                  <select className="form-input" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} style={{ cursor: 'pointer' }}>
                    <option>Meta</option>
                    <option>Google</option>
                    <option>Email</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={{ cursor: 'pointer' }}>
                    <option>Draft</option>
                    <option>Active</option>
                    <option>Paused</option>
                    <option>Completed</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Budget (USD)</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  placeholder="e.g. 5000"
                  value={form.budget}
                  onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input type="date" className="form-input" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input type="date" className="form-input" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2 }}>
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignsPage;
