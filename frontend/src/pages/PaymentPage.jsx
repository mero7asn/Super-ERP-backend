import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import logo from '../assets/logo.png';

const PAYMENT_METHODS = ['Credit Card', 'PayPal', 'Bank Transfer', 'Apple Pay', 'Google Pay'];

const PaymentPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [method, setMethod] = useState('Credit Card');
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(null);
  const [payError, setPayError] = useState('');

  useEffect(() => {
    const fetchOffer = async () => {
      try {
        const { data } = await axios.get(`/api/public/pay/${token}`);
        if (data.alreadyPaid) {
          setPaid({ bookingRef: data.data.bookingRef, amount: data.data.price });
          return;
        }
        setOffer(data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'This payment link is not available.');
      } finally {
        setLoading(false);
      }
    };
    fetchOffer();
  }, [token]);

  const handlePay = async (e) => {
    e.preventDefault();
    setPaying(true);
    setPayError('');

    if (!cardholderName.trim()) return setPayError('Cardholder name is required.');
    if (!/^\d{13,19}$/.test(cardNumber.replace(/\s/g, ''))) return setPayError('Enter a valid card number.');
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return setPayError('Enter expiry as MM/YY.');
    if (!/^\d{3,4}$/.test(cvv)) return setPayError('Enter a valid CVV.');

    try {
      const { data } = await axios.post(`/api/public/pay/${token}`, { method });
      setPaid({
        bookingRef: data.data.bookingRef,
        amount: data.data.amount,
        method: data.data.method,
        paidAt: data.data.paidAt
      });
    } catch (err) {
      setPayError(err.response?.data?.message || 'Payment failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <div className="spinner" />
      </div>
    );
  }

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <img src={logo} alt="Logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
          <span style={{ fontSize: 18, fontWeight: 700, background: 'linear-gradient(135deg, #2563EB, #14B8A6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Super CRM</span>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>
        )}

        {paid ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Payment Successful</h2>
            <p style={{ color: '#64748b', marginBottom: 20 }}>
              A booking has been created for <strong>${Number(paid.amount).toLocaleString()}</strong>.
            </p>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 16, textAlign: 'left' }}>
              <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Booking Reference</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#2563EB', margin: '4px 0 8px' }}>{paid.bookingRef}</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>Payment Method: {paid.method}</div>
            </div>
            <button className="btn btn-secondary" style={{ marginTop: 24 }} onClick={() => navigate('/login')}>
              Back to Login
            </button>
          </div>
        ) : offer ? (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{offer.title}</h1>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Complete your payment to confirm your booking.</p>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>Amount to pay</span>
                <span style={{ fontSize: 24, fontWeight: 700, color: '#2563EB' }}>${Number(offer.price).toLocaleString()}</span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                Valid until <strong>{new Date(offer.validUntil).toLocaleDateString()}</strong>
                {offer.leadName ? ` · For ${offer.leadName}` : ''}
              </div>
            </div>

            <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Payment Method</label>
                <select className="form-input" value={method} onChange={e => setMethod(e.target.value)}>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Cardholder Name</label>
                <input className="form-input" placeholder="John Doe" value={cardholderName} onChange={e => setCardholderName(e.target.value)} />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Card Number</label>
                <input className="form-input" placeholder="4242 4242 4242 4242" value={cardNumber} onChange={e => setCardNumber(e.target.value)} inputMode="numeric" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Expiry (MM/YY)</label>
                  <input className="form-input" placeholder="08/27" value={expiry} onChange={e => setExpiry(e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">CVV</label>
                  <input className="form-input" placeholder="123" value={cvv} onChange={e => setCvv(e.target.value)} inputMode="numeric" />
                </div>
              </div>

              {payError && <div className="alert alert-error">{payError}</div>}

              <button type="submit" className="btn btn-primary" disabled={paying} style={{ marginTop: 8 }}>
                {paying ? 'Processing…' : `Pay $${Number(offer.price).toLocaleString()}`}
              </button>
            </form>

            <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 16 }}>
              This is a demo payment page. Do not enter real card details.
            </p>
          </>
        ) : !error ? (
          <div className="alert alert-error">This payment link is not available.</div>
        ) : null}
      </div>
    </div>
  );
};

export default PaymentPage;
