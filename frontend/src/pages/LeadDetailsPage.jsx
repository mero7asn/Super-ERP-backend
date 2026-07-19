import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import OfferHistoryModal from '../components/OfferHistoryModal';
import OfferVersionsModal from '../components/OfferVersionsModal';

const statusBadge = (status) => {
  const map = {
    New: 'badge-new', Contacted: 'badge-contacted', Qualified: 'badge-qualified', 
    Lost: 'badge-lost', Converted: 'badge-converted', Draft: 'badge-new', 
    Sent: 'badge-contacted', Viewed: 'badge-qualified', Accepted: 'badge-converted', 
    Rejected: 'badge-lost', Expired: 'badge-meta', Completed: 'badge-completed', 
    Canceled: 'badge-lost', Refunded: 'badge-meta'
  };
  return map[status] || 'badge-new';
};

const STATUSES = ['New', 'Contacted', 'Qualified', 'Lost', 'Converted'];

const LeadDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = ['Super CRM Administrator', 'System Architect'].includes(user?.role);
  
  const [lead, setLead] = useState(null);
  const [offers, setOffers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Lead Update
  const [updatingLead, setUpdatingLead] = useState(false);
  
  // Modals & Forms
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyOpenId, setHistoryOpenId] = useState(null);
  const [showReviseModal, setShowReviseModal] = useState(false);
  const [reviseOpenId, setReviseOpenId] = useState(null);
  const [revisionRequirement, setRevisionRequirement] = useState('');
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [versionsOpenId, setVersionsOpenId] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);

  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [newOffer, setNewOffer] = useState({
    title: '', description: '', offerType: 'Service', 
    price: '', validUntil: '', notes: ''
  });

  // Image Uploads
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUploadTarget, setImageUploadTarget] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageCaption, setImageCaption] = useState('');

  const fetchData = async () => {
    try {
      const [leadRes, offersRes] = await Promise.all([
        API.get(`/leads/${id}`),
        API.get(`/offers/lead/${id}`)
      ]);
      setLead(leadRes.data.data);
      setOffers(offersRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await API.get('/offers/templates');
      setTemplates(res.data.data || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchTemplates();
  }, [id]);

  useEffect(() => {
    if (selectedTemplate) {
      const template = templates.find(t => t._id === selectedTemplate);
      if (template) {
        const validUntilDate = new Date();
        validUntilDate.setDate(validUntilDate.getDate() + (template.validDays || 30));
        setNewOffer(prev => ({
          ...prev,
          title: template.title,
          description: template.description,
          price: template.price.toString(),
          validUntil: validUntilDate.toISOString().split('T')[0]
        }));
      }
    }
  }, [selectedTemplate, templates]);

  const updateLeadStatus = async (newStatus) => {
    setUpdatingLead(true);
    try {
      const { data } = await API.put(`/leads/${id}`, { status: newStatus });
      setLead(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update lead');
    } finally {
      setUpdatingLead(false);
    }
  };

  const handleCreateOffer = async () => {
    if (!newOffer.title.trim()) return setError('Offer title is required');
    if (!newOffer.description.trim()) return setError('Offer description is required');
    if (!newOffer.price || isNaN(parseFloat(newOffer.price))) return setError('Valid price is required');
    if (!newOffer.validUntil) return setError('Valid until date is required');
    
    setSaving(true);
    setError('');
    try {
      await API.post('/offers', { ...newOffer, lead: id, price: parseFloat(newOffer.price) });
      await fetchData();
      setShowOfferModal(false);
      setNewOffer({ title: '', description: '', offerType: 'Service', price: '', validUntil: '', notes: '' });
      setSelectedTemplate('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create offer');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateOffer = async () => {
    if (!editingOffer.title.trim()) return setError('Offer title is required');
    if (!editingOffer.description.trim()) return setError('Offer description is required');
    if (!editingOffer.price || isNaN(parseFloat(editingOffer.price))) return setError('Valid price is required');
    if (!editingOffer.validUntil) return setError('Valid until date is required');
    
    setSaving(true);
    setError('');
    try {
      await API.put(`/offers/${editingOffer._id}`, { ...editingOffer, price: parseFloat(editingOffer.price) });
      await fetchData();
      setShowEditModal(false);
      setEditingOffer(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update offer');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (offer) => {
    setEditingOffer({
      ...offer,
      price: offer.price.toString(),
      validUntil: offer.validUntil.split('T')[0]
    });
    setShowEditModal(true);
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

  const handlePayNow = async (offerId) => {
    try {
      const { data } = await API.get(`/offers/${offerId}/payment-link`);
      if (data?.data?.link) {
        window.open(data.data.link, '_blank');
      } else {
        setError('Could not generate payment link.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to open payment page');
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

  const handleRevise = async (offerId) => {
    if (!revisionRequirement.trim()) return setError('Please describe the customer requirement.');
    setError('');
    try {
      await API.post(`/offers/${offerId}/revise`, { requirement: revisionRequirement });
      setShowReviseModal(false);
      setReviseOpenId(null);
      setRevisionRequirement('');
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to revise offer');
    }
  };

  const handleUpdateOfferStatus = async (offerId, status) => {
    try {
      await API.put(`/offers/${offerId}`, { status });
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleUploadImage = async (e) => {
    if (e) e.preventDefault();
    if (!selectedFile) return setError('Please select an image file first');
    setSaving(true);
    setError('');
    
    const formData = new FormData();
    formData.append('image', selectedFile);
    if (imageCaption) formData.append('caption', imageCaption);

    try {
      await API.post(`/offers/${imageUploadTarget}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await fetchData();
      setShowImageModal(false);
      setImageUploadTarget(null);
      setSelectedFile(null);
      setImageCaption('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload image');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteImage = async (offerId, imageId) => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    try {
      await API.delete(`/offers/${offerId}/images/${imageId}`);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete image');
    }
  };

  if (loading) return <div className="loading-state"><div className="spinner" />Loading lead details…</div>;
  if (!lead) return <div className="empty-state"><p>Lead not found</p></div>;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/leads')} className="sidebar-link" style={{ width: 'auto', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
            </svg>
            Back to Leads
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>
        
        {/* Left Column: Lead Information */}
        <div className="table-wrapper" style={{ padding: 24 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 16,
          }}>
            {lead.name.substring(0, 2).toUpperCase()}
          </div>
          
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{lead.name}</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</div>
              <div style={{ fontSize: 14, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{lead.email}</div>
            </div>
            {lead.phone && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone</div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{lead.phone}</div>
              </div>
            )}
            
            <div style={{ marginTop: 10, padding: '12px 0', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Lead Status</div>
              <select
                value={lead.status}
                onChange={e => updateLeadStatus(e.target.value)}
                disabled={updatingLead}
                style={{
                  width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                  borderRadius: 6, padding: '8px 12px', fontSize: 13,
                  fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)'
                }}
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Source</div>
              <div style={{ marginTop: 4 }}><span className={`badge ${lead.source === 'Meta' ? 'badge-meta' : lead.source === 'Google' ? 'badge-google' : 'badge-new'}`}>{lead.source}</span></div>
            </div>
            
            {lead.assignedTo && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assigned Agent</div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{lead.assignedTo.firstName} {lead.assignedTo.lastName}</div>
              </div>
            )}
            
            {lead.notes && (
              <div style={{ marginTop: 10, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Notes</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{lead.notes}</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Offers & Tabs */}
        <div>
          {/* Tab Headers */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: 20 }}>
            <div style={{ padding: '12px 24px', borderBottom: '2px solid var(--accent-primary)', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}>
              Offers ({offers.length})
            </div>
            {/* Future tabs can go here */}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <button className="btn btn-primary" onClick={() => setShowOfferModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="M12 5v14"/>
              </svg>
              Create Offer
            </button>
          </div>

          {/* Offers List */}
          {offers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💼</div>
              <p>No offers yet. Create one to get started.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {offers.map(offer => (
                <div key={offer._id} className="table-wrapper" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Header Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{offer.title}</h3>
                        <span className={`badge ${statusBadge(offer.status)}`}>{offer.status}</span>
                        <span className={`badge ${offer.offerType === 'Product' ? 'badge-contacted' : 'badge-qualified'}`}>{offer.offerType}</span>
                        <span className="badge badge-meta" style={{ fontSize: 10, padding: '2px 8px', fontWeight: 700 }}>v{offer.version || 1}</span>
                      </div>
                      <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>{offer.description}</p>
                      
                      {/* Offer Images Gallery */}
                      {offer.images && offer.images.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 14 }}>
                          {offer.images.map(img => img && img.url && (
                            <div key={img._id || img.url} style={{ position: 'relative', width: 100, height: 100, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)', background: '#000' }}>
                              <img 
                                src={img.url.startsWith('http') ? img.url : `http://localhost:5000${img.url}`}
                                alt={img.caption || 'Offer item'} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                title={img.caption || 'No caption'}
                              />
                              {(isAdmin || (offer.createdBy && offer.createdBy._id?.toString() === user._id?.toString())) && (
                                <button 
                                  type="button"
                                  onClick={() => handleDeleteImage(offer._id, img._id)}
                                  style={{
                                    position: 'absolute', top: 4, right: 4, 
                                    background: 'rgba(239, 68, 68, 0.85)', color: '#fff',
                                    border: 'none', borderRadius: '50%', width: 20, height: 20,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', fontSize: 10, padding: 0
                                  }}
                                  title="Delete photo"
                                >
                                  ✕
                                </button>
                              )}
                              {img.caption && (
                                <div style={{
                                  position: 'absolute', bottom: 0, left: 0, right: 0,
                                  background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 9,
                                  padding: '2px 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                }}>
                                  {img.caption}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-primary)' }}>${offer.price.toLocaleString()}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Valid until {new Date(offer.validUntil).toLocaleDateString()}</div>
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div style={{ display: 'flex', gap: 24, fontSize: 13, color: 'var(--text-muted)', background: 'var(--bg-primary)', padding: 12, borderRadius: 8 }}>
                    <div>Created By: <strong style={{ color: 'var(--text-secondary)' }}>{offer.createdBy.firstName} {offer.createdBy.lastName}</strong></div>
                    {offer.recordLocator && (
                      <div>Locator: <strong style={{ color: 'var(--accent-primary)' }}>{offer.recordLocator}</strong></div>
                    )}
                    {offer.bookingRef && (
                      <div>Booking: <strong style={{ color: 'var(--accent-primary)' }}>{offer.bookingRef}</strong></div>
                    )}
                    {offer.status === 'Paid' && offer.paymentMethod && (
                      <div>Paid via: <strong>{offer.paymentMethod}</strong></div>
                    )}
                    {offer.sentAt && (
                      <div>Sent: <strong>{new Date(offer.sentAt).toLocaleDateString()}</strong> via {offer.sentVia}</div>
                    )}
                    {offer.revisionNote && (
                      <div style={{ flex: 1 }}>Revision Req: <strong>{offer.revisionNote}</strong></div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 8, borderTop: '1px solid var(--border-color)' }}>
                    {offer.status === 'Draft' && (
                      <>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleSend(offer._id, 'Email')} disabled={sendingId === offer._id}>
                        {sendingId === offer._id ? 'Sending...' : '📧 Send Email'}
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleSend(offer._id, 'SMS')} disabled={sendingId === offer._id}>
                        💬 Send SMS
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleSend(offer._id, 'Both')} disabled={sendingId === offer._id}>
                        📮 Send Both
                      </button>
                        {offer.createdBy._id === user._id && (
                          <>
                            <button className="btn btn-secondary btn-sm" onClick={() => { setImageUploadTarget(offer._id); setShowImageModal(true); }}>
                              📷 Add Photo
                            </button>
                            <button className="btn btn-primary btn-sm" onClick={() => openEditModal(offer)}>
                              ✏️ Edit
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(offer._id)} style={{ color: 'var(--status-lost)' }}>
                              🗑️ Delete
                            </button>
                          </>
                        )}
                      </>
                    )}
                    
                    {offer.status === 'Sent' && (
                      <>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleSend(offer._id, 'Email')} disabled={sendingId === offer._id}>
                          {sendingId === offer._id ? 'Sending...' : '🔄 Resend Email'}
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleSend(offer._id, 'SMS')} disabled={sendingId === offer._id}>
                          🔄 Resend SMS
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleSend(offer._id, 'Both')} disabled={sendingId === offer._id}>
                          🔄 Resend Both
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => { setReviseOpenId(offer._id); setShowReviseModal(true); setRevisionRequirement(''); }}>
                          ✏️ Revise Offer
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setImageUploadTarget(offer._id); setShowImageModal(true); }}>
                          📷 Add Photo
                        </button>
                      </>
                    )}

                    {offer.status === 'Accepted' && (
                      <button className="btn btn-primary btn-sm" onClick={() => handleUpdateOfferStatus(offer._id, 'Completed')}>
                        ✅ Complete Sale
                      </button>
                    )}

                    {!['Paid', 'Expired', 'Canceled'].includes(offer.status) && (
                      <button className="btn btn-primary btn-sm" onClick={() => handlePayNow(offer._id)}>
                        💳 Pay Now
                      </button>
                    )}

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setHistoryOpenId(offer._id); setShowHistoryModal(true); }}>
                        📋 History
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setVersionsOpenId(offer._id); setShowVersionsModal(true); }}>
                        📑 Versions
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Offer Modal */}
      {showOfferModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20
        }} onClick={() => setShowOfferModal(false)}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 12, padding: 32, maxWidth: 600, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Create New Offer</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Build a custom offer for {lead.name}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {templates.length > 0 && (
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
                </div>
              )}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Offer Type</label>
                <select
                  className="form-input"
                  value={newOffer.offerType}
                  onChange={e => setNewOffer(p => ({ ...p, offerType: e.target.value }))}
                >
                  <option value="Product">Product</option>
                  <option value="Service">Service</option>
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Offer Title</label>
                <input className="form-input" placeholder="e.g. Premium Package" value={newOffer.title} onChange={e => setNewOffer(p => ({ ...p, title: e.target.value }))} />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Description</label>
                <textarea className="form-input" rows="3" placeholder="Describe what's included..." value={newOffer.description} onChange={e => setNewOffer(p => ({ ...p, description: e.target.value }))} />
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
                <label className="form-label">Internal Notes</label>
                <textarea className="form-input" rows="2" placeholder="Private notes..." value={newOffer.notes} onChange={e => setNewOffer(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowOfferModal(false)} disabled={saving}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleCreateOffer} disabled={saving}>
                {saving ? 'Creating...' : 'Create Offer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Other Modals */}
      {showHistoryModal && historyOpenId && (
        <OfferHistoryModal offerId={historyOpenId} onClose={() => { setShowHistoryModal(false); setHistoryOpenId(null); }} />
      )}

      {showReviseModal && reviseOpenId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20
        }} onClick={() => { setShowReviseModal(false); setReviseOpenId(null); setRevisionRequirement(''); }}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 12, padding: 32, maxWidth: 500, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Revise Offer</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Describe the customer requirement to freeze the current version and open a new draft.</p>
            <div className="form-group">
              <label className="form-label">Customer Requirement <span style={{ color: 'var(--status-lost)' }}>*</span></label>
              <textarea
                className="form-input" rows="4" placeholder="e.g. 10% lower price"
                value={revisionRequirement} onChange={e => setRevisionRequirement(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => { setShowReviseModal(false); setReviseOpenId(null); setRevisionRequirement(''); }}>Cancel</button>
              <button className="btn btn-primary" onClick={() => handleRevise(reviseOpenId)}>
                Revise Offer
              </button>
            </div>
          </div>
        </div>
      )}

      {showVersionsModal && versionsOpenId && (
        <OfferVersionsModal offerId={versionsOpenId} onClose={() => { setShowVersionsModal(false); setVersionsOpenId(null); }} />
      )}

      {/* Edit Offer Modal */}
      {showEditModal && editingOffer && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20
        }} onClick={() => setShowEditModal(false)}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 12, padding: 32, maxWidth: 600, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Edit Offer</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Update this draft offer before sending.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Offer Type</label>
                <select
                  className="form-input"
                  value={editingOffer.offerType}
                  onChange={e => setEditingOffer(p => ({ ...p, offerType: e.target.value }))}
                >
                  <option value="Product">Product</option>
                  <option value="Service">Service</option>
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Offer Title</label>
                <input className="form-input" placeholder="e.g. Premium Package" value={editingOffer.title} onChange={e => setEditingOffer(p => ({ ...p, title: e.target.value }))} />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Description</label>
                <textarea className="form-input" rows="3" placeholder="Describe what's included..." value={editingOffer.description} onChange={e => setEditingOffer(p => ({ ...p, description: e.target.value }))} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Price ($)</label>
                  <input className="form-input" type="number" step="0.01" placeholder="0.00" value={editingOffer.price} onChange={e => setEditingOffer(p => ({ ...p, price: e.target.value }))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Valid Until</label>
                  <input className="form-input" type="date" value={editingOffer.validUntil} onChange={e => setEditingOffer(p => ({ ...p, validUntil: e.target.value }))} />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Internal Notes</label>
                <textarea className="form-input" rows="2" placeholder="Private notes..." value={editingOffer.notes || ''} onChange={e => setEditingOffer(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)} disabled={saving}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleUpdateOffer} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Upload Modal */}
      {showImageModal && imageUploadTarget && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20
        }} onClick={() => { setShowImageModal(false); setImageUploadTarget(null); setSelectedFile(null); setImageCaption(''); }}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 12, padding: 32, maxWidth: 500, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Add Photo to Offer</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Upload a product image or document receipt</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Select Image <span style={{ color: 'var(--status-lost)' }}>*</span></label>
                <input 
                  className="form-input" 
                  type="file" 
                  accept="image/*" 
                  onChange={e => setSelectedFile(e.target.files[0])} 
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Caption (optional)</label>
                <input 
                  className="form-input" 
                  placeholder="e.g. Front view, contract page" 
                  value={imageCaption} 
                  onChange={e => setImageCaption(e.target.value)} 
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowImageModal(false); setImageUploadTarget(null); setSelectedFile(null); setImageCaption(''); }} disabled={saving}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleUploadImage} disabled={saving}>
                {saving ? 'Uploading...' : 'Upload Image'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadDetailsPage;
