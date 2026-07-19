import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import API from '../services/api';
import logo from '../assets/logo.png';

const CampaignFormPage = () => {
  const { slug } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' });

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const { data } = await API.get(`/public/form/${slug}`);
        setCampaign(data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'This form is not available.');
      } finally {
        setLoading(false);
      }
    };
    fetchCampaign();
  }, [slug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      await API.post(`/public/form/${slug}`, form);
      setSubmitted(true);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 30% 50%, rgba(37,99,235,0.1) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(20,184,166,0.08) 0%, transparent 50%), #F8FAFC',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        width: '100%', maxWidth: 480, padding: 40,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <img src={logo} alt="Logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
          <span style={{
            fontSize: 18, fontWeight: 700,
            background: 'linear-gradient(135deg, #2563EB, #14B8A6)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Super CRM</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            Loading form…
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🚫</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#1F2937' }}>Form Unavailable</h2>
            <p style={{ color: '#6B7280', fontSize: 14 }}>{error}</p>
          </div>
        ) : submitted ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: '#1F2937' }}>Thank You!</h2>
            <p style={{ color: '#6B7280', fontSize: 14 }}>Your information has been received. We'll be in touch shortly.</p>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: '#1F2937' }}>{campaign?.name}</h1>
            <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 28 }}>
              Fill in the form below and we'll get back to you as soon as possible.
            </p>

            {formError && (
              <div className="alert alert-error" style={{ marginBottom: 16 }}>{formError}</div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name <span style={{ color: '#EF4444' }}>*</span></label>
                <input
                  className="form-input"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address <span style={{ color: '#EF4444' }}>*</span></label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="john@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number <span style={{ color: '#EF4444' }}>*</span></label>
                <input
                  className="form-input"
                  placeholder="+1 234 567 8900"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Message <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(optional)</span></label>
                <textarea
                  className="form-input"
                  placeholder="Tell us how we can help…"
                  rows={3}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                style={{ marginTop: 8 }}
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default CampaignFormPage;
