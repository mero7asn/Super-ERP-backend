import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';

const statusBadge = (status) => {
  const map = { Draft: 'badge-new', Sent: 'badge-contacted', Viewed: 'badge-qualified', Accepted: 'badge-converted', Rejected: 'badge-lost', Expired: 'badge-meta', Completed: 'badge-completed', Canceled: 'badge-lost', Refunded: 'badge-meta' };
  return map[status] || 'badge-new';
};

const OffersPage = () => {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lead, setLead] = useState(null);
  const [offers, setOffers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [newOffer, setNewOffer] = useState({
    title: '',
    description: '',
    price: '',
    validUntil: '',
    notes: ''
  });

  const fetchData = async () => {
    try {
      const [leadsRes, offersRes] = await Promise.all([
        API.get('/leads'),
        API.get(`/offers/lead/${leadId}`)
      ]);
      const leadData = leadsRes.data.data.find(l => l._id === leadId);
      setLead(leadData);
      setOffers(offersRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await API.get('/offers/templates');
      setTemplates(res.data.data || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchTemplates();
  }, [leadId]);

  useEffect(() => {
    if (selectedTemplate) {
      const template = templates.find(t => t._id === selectedTemplate);
      if (template) {
        const validUntilDate = new Date();
        validUntilDate.setDate(validUntilDate.getDate() + (template.validDays || 30));
        const templateData = {
          title: template.title,
          description: template.description,
          price: template.price.toString(),
          validUntil: validUntilDate.toISOString().split('T')[0]
        };
        setNewOffer(prev => ({ ...prev, ...templateData }));
      }
    }
  }, [selectedTemplate, templates]);

  const handleCreate = async () => {
    if (!newOffer.title.trim()) {
      setError('Offer title is required');
      return;
    }
    if (!newOffer.description.trim()) {
      setError('Offer description is required');
      return;
    }
    if (!newOffer.price || isNaN(parseFloat(newOffer.price))) {
      setError('Price is required and must be a valid number');
      return;
    }
    if (!newOffer.validUntil) {
      setError('Valid until date is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await API.post('/offers', { ...newOffer, lead: leadId, price: parseFloat(newOffer.price) });
      await fetchData();
      setShowModal(false);
      setNewOffer({ title: '', description: '', price: '', validUntil: '', notes: '' });
      setSelectedTemplate('');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create offer';
      const detail = err.response?.data?.error ? `: ${err.response.data.error}` : '';
      setError(msg + detail);
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async (offerId, method) => {
    setSendingId(offerId);
    try {
      await API.post(`/offers/${offerId}/send`, { method });
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send offer');
    } finally {
      setSendingId(null);
    }
  };

  const handleDelete = async (offerId) => {
    if (!confirm('Delete this offer?')) return;
    try {
      await API.delete(`/offers/${offerId}`);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete offer');
    }
  };

  const handleImageUpload = async (offerId, file, caption) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      if (caption) formData.append('caption', caption);
      await API.post(`/offers/${offerId}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload image');
    }
  };

  const handleDeleteImage = async (offerId, imageId) => {
    if (!confirm('Remove this image?')) return;
    try {
      await API.delete(`/offers/${offerId}/images/${imageId}`);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete image');
    }
  };

  const handleUpdateStatus = async (offerId, status) => {
    try {
      await API.put(`/offers/${offerId}`, { status });
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  const getApiUrl = () => process.env.VITE_API_URL || 'http://localhost:5000';

  if (loading) return <div className="loading-state"><div className="spinner" />Loading offers…</div>;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/leads')} className="sidebar-link" style={{ width: 'auto', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
            </svg>
            Back
          </button>
          <div>
            <h1 className="page-title">Offers for {lead?.name}</h1>
            <p className="page-subtitle">{lead?.email} {lead?.phone && `• ${lead?.phone}`}</p>
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/><path d="M12 5v14"/>
          </svg>
          Create Offer
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-wrapper">
        <div className="table-header">
          <span className="table-title">{offers.length} Offer{offers.length !== 1 ? 's' : ''}</span>
        </div>

        {offers.length === 0 ? (
          <div className="empty-state">
            <p>No offers yet. Create one to get started.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Offer</th>
                <th>Price</th>
                <th>Valid Until</th>
                <th>Status</th>
                <th>Created By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {offers.map(offer => (
                <tr key={offer._id}>
                  <td>
                    <strong style={{ fontSize: 14 }}>{offer.title}</strong>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{offer.description}</div>
                    {offer.recordLocator && (
                      <div style={{ fontSize: 11, color: 'var(--accent-primary)', fontWeight: 600, marginTop: 4 }}>
                        Booking: {offer.recordLocator}
                      </div>
                    )}
                    {offer.images && offer.images.length > 0 && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                        {offer.images.map(img => (
                          <div key={img._id || img.url} style={{ position: 'relative' }}>
                            <img src={`${getApiUrl()}${img.url}`} alt={img.caption || 'Offer image'} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border-color)' }} />
                            {offer.status === 'Draft' && offer.createdBy._id === user._id && (
                              <button onClick={() => handleDeleteImage(offer._id, img._id)} style={{ position: 'absolute', top: -6, right: -6, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '50%', width: 20, height: 20, fontSize: 10, cursor: 'pointer', color: 'var(--status-lost)' }}>×</button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {offer.status === 'Draft' && offer.createdBy._id === user._id && (
                      <div style={{ marginTop: 8 }}>
                        <input type="file" accept="image/*" onChange={e => {
                          const file = e.target.files[0];
                          if (file) handleImageUpload(offer._id, file, '');
                        }} style={{ fontSize: 11 }} />
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-primary)' }}>${offer.price.toLocaleString()}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(offer.validUntil).toLocaleDateString()}</td>
                  <td><span className={`badge ${statusBadge(offer.status)}`}>{offer.status}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {offer.createdBy.firstName} {offer.createdBy.lastName}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {offer.status === 'Draft' && (
                        <>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleSend(offer._id, 'Email')}
                            disabled={sendingId === offer._id}
                            style={{ fontSize: 11, padding: '4px 10px' }}
                          >
                            {sendingId === offer._id ? 'Sending...' : '📧 Email'}
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleSend(offer._id, 'SMS')}
                            disabled={sendingId === offer._id}
                            style={{ fontSize: 11, padding: '4px 10px' }}
                          >
                            💬 SMS
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleSend(offer._id, 'Both')}
                            disabled={sendingId === offer._id}
                            style={{ fontSize: 11, padding: '4px 10px' }}
                          >
                            📮 Both
                          </button>
                          {offer.createdBy._id === user._id && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleDelete(offer._id)}
                              style={{ fontSize: 11, padding: '4px 10px', color: 'var(--status-lost)' }}
                            >
                              🗑️
                            </button>
                          )}
                        </>
                      )}
                      {offer.status === 'Sent' && (
                        <>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleSend(offer._id, 'Email')}
                            disabled={sendingId === offer._id}
                            style={{ fontSize: 11, padding: '4px 10px' }}
                          >
                            {sendingId === offer._id ? 'Sending...' : '🔄 Resend Email'}
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleSend(offer._id, 'SMS')}
                            disabled={sendingId === offer._id}
                            style={{ fontSize: 11, padding: '4px 10px' }}
                          >
                            🔄 Resend SMS
                          </button>
                        </>
                      )}
                      {offer.status === 'Accepted' && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleUpdateStatus(offer._id, 'Completed')}
                          style={{ fontSize: 11, padding: '4px 10px' }}
                        >
                          ✅ Complete Sale
                        </button>
                      )}
                      {offer.sentAt && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          Sent {new Date(offer.sentAt).toLocaleDateString()} via {offer.sentVia}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Offer Modal */}
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
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Create New Offer</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Build a custom offer for {lead?.name}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {loadingTemplates ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading templates...</div>
              ) : templates.length > 0 && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Use Template (optional)</label>
                  <select
                    className="form-input"
                    value={selectedTemplate}
                    onChange={e => setSelectedTemplate(e.target.value)}
                  >
                    <option value="">— Select a template —</option>
                    {templates.map(t => (
                      <option key={t._id} value={t._id}>{t.name}</option>
                    ))}
                  </select>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Choose a template to auto-fill the form fields
                  </div>
                </div>
              )}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Offer Title</label>
                <input className="form-input" placeholder="e.g. Premium Package" value={newOffer.title} onChange={e => setNewOffer(p => ({ ...p, title: e.target.value }))} />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Description</label>
                <textarea className="form-input" rows="3" placeholder="Describe what's included in this offer..." value={newOffer.description} onChange={e => setNewOffer(p => ({ ...p, description: e.target.value }))} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Price ($)</label>
                  <input className="form-input" type="number" step="0.01" placeholder="0.00" value={newOffer.price} onChange={e => setNewOffer(p => ({ ...p, price: e.target.value }))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Valid Until</label>
                  <input className="form-input" type="date" value={newOffer.validUntil} onChange={e => setNewOffer(p => ({ ...p, validUntil: e.target.value }))} />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Internal Notes (optional)</label>
                <textarea className="form-input" rows="2" placeholder="Private notes for your reference..." value={newOffer.notes} onChange={e => setNewOffer(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={saving}>
                {saving ? 'Creating...' : 'Create Offer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OffersPage;