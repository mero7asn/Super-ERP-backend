import { useState, useEffect, useMemo } from 'react';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// Category definitions
const BENEFIT_CATEGORIES = [
  { id: 'All', label: 'All', emoji: '🗂' },
  { id: 'Health', label: 'Health & Wellness', emoji: '🏥' },
  { id: 'Financial', label: 'Financial', emoji: '💰' },
  { id: 'Lifestyle', label: 'Lifestyle & Leisure', emoji: '🌴' },
  { id: 'Education', label: 'Education & Training', emoji: '📚' },
  { id: 'Insurance', label: 'Insurance', emoji: '🛡' },
  { id: 'Transport', label: 'Transportation', emoji: '🚌' },
  { id: 'Other', label: 'Other', emoji: '📦' },
];

const CATEGORY_COLORS = {
  Health: { bg: 'rgba(16,185,129,0.1)', border: '#10B981', text: '#6EE7B7' },
  Financial: { bg: 'rgba(245,158,11,0.1)', border: '#F59E0B', text: '#FCD34D' },
  Lifestyle: { bg: 'rgba(59,130,246,0.1)', border: '#3B82F6', text: '#60A5FA' },
  Education: { bg: 'rgba(99,102,241,0.1)', border: '#6366F1', text: '#A5B4FC' },
  Insurance: { bg: 'rgba(236,72,153,0.1)', border: '#EC4899', text: '#F9A8D4' },
  Transport: { bg: 'rgba(234,179,8,0.1)', border: '#EAB308', text: '#FDE047' },
  Other: { bg: 'rgba(107,114,128,0.1)', border: '#6B7280', text: '#9CA3AF' },
};

const getCategoryColor = (cat) => CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other;
const getCategoryEmoji = (cat) => BENEFIT_CATEGORIES.find((c) => c.id === cat)?.emoji || '📦';

const PartnershipsPage = () => {
  const { user } = useAuth();
  const [partnerships, setPartnerships] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // View: 'benefits' | 'suggestions'
  const [activeTab, setActiveTab] = useState('benefits');

  // Benefits form
  const [companyName, setCompanyName] = useState('');
  const [benefitCategory, setBenefitCategory] = useState('Health');
  const [benefitDetails, setBenefitDetails] = useState('');
  const [benefitContact, setBenefitContact] = useState('');
  const [benefitExpiry, setBenefitExpiry] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Benefits filters
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Suggestion form
  const [suggTitle, setSuggTitle] = useState('');
  const [suggCategory, setSuggCategory] = useState('Health');
  const [suggDetails, setSuggDetails] = useState('');
  const [submittingSugg, setSubmittingSugg] = useState(false);

  const isBD = ['HRM System Administrator', 'HR Manager', 'HR Business Partner', 'Super CRM Administrator'].includes(user?.role);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [partRes, suggRes] = await Promise.all([
        API.get('/hrm/partnerships'),
        API.get('/hrm/suggestions'),
      ]);
      setPartnerships(partRes.data?.data || []);
      setSuggestions(suggRes.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreatePartnership = async (e) => {
    e.preventDefault();
    if (!companyName || !benefitDetails) return;
    setSubmitting(true);
    try {
      await API.post('/hrm/partnerships', {
        companyName,
        category: benefitCategory,
        benefitDetails,
        contactInfo: benefitContact,
        expiryDate: benefitExpiry || undefined,
      });
      setStatusMsg({ type: 'success', text: `Partnership with "${companyName}" saved.` });
      setCompanyName(''); setBenefitDetails(''); setBenefitContact(''); setBenefitExpiry('');
      fetchAll();
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to save partnership deal.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitSuggestion = async (e) => {
    e.preventDefault();
    if (!suggTitle || !suggDetails) return;
    setSubmittingSugg(true);
    try {
      await API.post('/hrm/suggestions', {
        title: suggTitle,
        category: suggCategory,
        details: suggDetails,
      });
      setStatusMsg({ type: 'success', text: 'Your suggestion has been submitted for HR review.' });
      setSuggTitle(''); setSuggDetails('');
      fetchAll();
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to submit suggestion.' });
    } finally {
      setSubmittingSugg(false);
    }
  };

  const handleUpdateSuggestion = async (suggId, newStatus) => {
    try {
      await API.put(`/hrm/suggestions/${suggId}`, { status: newStatus });
      setStatusMsg({ type: 'success', text: `Suggestion marked as "${newStatus}".` });
      fetchAll();
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to update suggestion.' });
    }
  };

  // Filtered partnerships
  const filteredPartnerships = useMemo(() => {
    return partnerships.filter((p) => {
      const catMatch = categoryFilter === 'All' || p.category === categoryFilter;
      const textMatch = searchTerm === '' ||
        p.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.benefitDetails?.toLowerCase().includes(searchTerm.toLowerCase());
      return catMatch && textMatch;
    });
  }, [partnerships, categoryFilter, searchTerm]);

  // Stats
  const suggStats = useMemo(() => ({
    pending: suggestions.filter((s) => s.status === 'Pending').length,
    approved: suggestions.filter((s) => s.status === 'Approved').length,
    declined: suggestions.filter((s) => s.status === 'Declined').length,
  }), [suggestions]);

  const SUGG_STATUS_COLORS = {
    Pending: { bg: '#F59E0B22', text: '#FCD34D', border: '#F59E0B44' },
    Approved: { bg: '#10B98122', text: '#6EE7B7', border: '#10B98144' },
    Declined: { bg: '#EF444422', text: '#FCA5A5', border: '#EF444444' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Business Development & People Culture</h1>
          <p className="page-subtitle">
            Manage corporate benefit partnerships, employee perks, and internal improvement suggestions
          </p>
        </div>
      </div>

      {statusMsg.text && (
        <div className={`alert alert-${statusMsg.type === 'error' ? 'error' : 'success'}`}>
          {statusMsg.text}
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 0 }}>
        {[
          { id: 'benefits', label: '🤝 Employee Benefits & Deals' },
          { id: 'suggestions', label: `💡 Improvement Suggestions (${suggestions.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 18px',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent-secondary)' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === tab.id ? 'var(--accent-secondary)' : 'var(--text-muted)',
              fontWeight: activeTab === tab.id ? 700 : 400,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Benefits Tab ── */}
      {activeTab === 'benefits' && (
        <>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {/* Create Form (BD Admins only) */}
            {isBD && (
              <div className="card" style={{ flex: '1 1 320px' }}>
                <h3 style={{ margin: '0 0 18px 0', fontSize: 15 }}>Add Corporate Deal / Benefit</h3>
                <form onSubmit={handleCreatePartnership} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Partner Company *</label>
                    <input className="form-input" value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Allianz Insurance, Gold's Gym" required />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Benefit Category *</label>
                    <select className="form-input" value={benefitCategory} onChange={(e) => setBenefitCategory(e.target.value)}>
                      {BENEFIT_CATEGORIES.filter((c) => c.id !== 'All').map((c) => (
                        <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Benefit Details *</label>
                    <textarea className="form-input" rows={3} value={benefitDetails}
                      onChange={(e) => setBenefitDetails(e.target.value)}
                      placeholder="e.g. 15% discount on memberships for all employees…" required />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Contact Info</label>
                    <input className="form-input" value={benefitContact}
                      onChange={(e) => setBenefitContact(e.target.value)}
                      placeholder="e.g. partners@example.com / 01012345678" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Deal Expiry Date</label>
                    <input className="form-input" type="date" value={benefitExpiry} onChange={(e) => setBenefitExpiry(e.target.value)} />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Saving…' : 'Save Deal'}
                  </button>
                </form>
              </div>
            )}

            {/* Benefits Display */}
            <div style={{ flex: '2 1 480px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Category Filters */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  className="form-input"
                  style={{ flex: '1 1 180px', padding: '6px 12px', fontSize: 12 }}
                  placeholder="Search benefits…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {BENEFIT_CATEGORIES.map((cat) => {
                  const colors = getCategoryColor(cat.id);
                  const isActive = categoryFilter === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryFilter(cat.id)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 20,
                        border: isActive ? `1px solid ${colors.border}` : '1px solid var(--border-color)',
                        background: isActive ? colors.bg : 'transparent',
                        color: isActive ? colors.text : 'var(--text-muted)',
                        fontSize: 12,
                        fontWeight: isActive ? 700 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {cat.emoji} {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Benefits Grid */}
              {loading ? (
                <div className="loading-state">Loading deals…</div>
              ) : filteredPartnerships.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                  No partnerships match the selected filters.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                  {filteredPartnerships.map((p) => {
                    const colors = getCategoryColor(p.category);
                    const emoji = getCategoryEmoji(p.category);
                    const isExpired = p.expiryDate && new Date(p.expiryDate) < new Date();
                    return (
                      <div
                        key={p._id}
                        style={{
                          padding: 20,
                          borderRadius: 10,
                          background: colors.bg,
                          border: `1px solid ${colors.border}44`,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>
                              {emoji} {p.companyName}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                              {BENEFIT_CATEGORIES.find((c) => c.id === p.category)?.label || p.category}
                            </div>
                          </div>
                          {isExpired ? (
                            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: '#EF444422', color: '#FCA5A5', border: '1px solid #EF444444' }}>
                              Expired
                            </span>
                          ) : (
                            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: '#10B98122', color: '#6EE7B7', border: '1px solid #10B98144' }}>
                              Active
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                          {p.benefitDetails}
                        </p>
                        {p.contactInfo && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            📞 {p.contactInfo}
                          </div>
                        )}
                        {p.expiryDate && (
                          <div style={{ fontSize: 11, color: isExpired ? '#FCA5A5' : 'var(--text-muted)' }}>
                            📅 Valid until: {new Date(p.expiryDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Suggestions Tab ── */}
      {activeTab === 'suggestions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Stats */}
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Pending Review', count: suggStats.pending, color: '#F59E0B' },
              { label: 'Approved', count: suggStats.approved, color: '#10B981' },
              { label: 'Declined', count: suggStats.declined, color: '#EF4444' },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  flex: '1 1 140px',
                  padding: '14px 18px',
                  borderRadius: 10,
                  background: `${s.color}12`,
                  border: `1px solid ${s.color}33`,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 26, color: s.color }}>{s.count}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {/* Submit Suggestion Form — all employees */}
            <div className="card" style={{ flex: '1 1 300px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 15 }}>Submit a Suggestion</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                All employees can submit benefit ideas or culture improvement suggestions. HR will review them.
              </p>
              <form onSubmit={handleSubmitSuggestion} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Suggestion Title *</label>
                  <input className="form-input" value={suggTitle}
                    onChange={(e) => setSuggTitle(e.target.value)}
                    placeholder="e.g. Partner with a local gym for discounts" required />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Category</label>
                  <select className="form-input" value={suggCategory} onChange={(e) => setSuggCategory(e.target.value)}>
                    {BENEFIT_CATEGORIES.filter((c) => c.id !== 'All').map((c) => (
                      <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Details *</label>
                  <textarea className="form-input" rows={4} value={suggDetails}
                    onChange={(e) => setSuggDetails(e.target.value)}
                    placeholder="Describe the benefit idea, how it would work, and why it would help employees…"
                    required />
                </div>
                <button type="submit" className="btn btn-primary" disabled={submittingSugg}>
                  {submittingSugg ? 'Submitting…' : '→ Submit Suggestion'}
                </button>
              </form>
            </div>

            {/* Suggestions List */}
            <div className="card" style={{ flex: '2 1 440px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 15 }}>Submitted Suggestions</h3>
              {loading ? (
                <div className="loading-state">Loading suggestions…</div>
              ) : suggestions.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>
                  No suggestions have been submitted yet. Be the first!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {suggestions.map((s) => {
                    const statusColors = SUGG_STATUS_COLORS[s.status] || SUGG_STATUS_COLORS.Pending;
                    const catColors = getCategoryColor(s.category);
                    const catEmoji = getCategoryEmoji(s.category);
                    return (
                      <div
                        key={s._id}
                        style={{
                          padding: '14px 16px',
                          borderRadius: 8,
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{s.title}</div>
                            <div style={{ fontSize: 11, color: catColors.text, marginBottom: 6 }}>
                              {catEmoji} {BENEFIT_CATEGORIES.find((c) => c.id === s.category)?.label || s.category}
                            </div>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                              {s.details}
                            </p>
                            {s.submittedBy && (
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                                Submitted by: {s.submittedBy.firstName} {s.submittedBy.lastName} ·{' '}
                                {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                            <span
                              style={{
                                padding: '4px 10px',
                                borderRadius: 12,
                                fontSize: 11,
                                fontWeight: 700,
                                background: statusColors.bg,
                                color: statusColors.text,
                                border: `1px solid ${statusColors.border}`,
                              }}
                            >
                              {s.status}
                            </span>
                            {isBD && s.status === 'Pending' && (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  className="btn btn-sm"
                                  style={{ padding: '3px 10px', fontSize: 11, background: '#10B98122', color: '#6EE7B7', border: '1px solid #10B98144' }}
                                  onClick={() => handleUpdateSuggestion(s._id, 'Approved')}
                                >
                                  ✓ Approve
                                </button>
                                <button
                                  className="btn btn-sm"
                                  style={{ padding: '3px 10px', fontSize: 11, background: '#EF444422', color: '#FCA5A5', border: '1px solid #EF444444' }}
                                  onClick={() => handleUpdateSuggestion(s._id, 'Declined')}
                                >
                                  ✗ Decline
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnershipsPage;
