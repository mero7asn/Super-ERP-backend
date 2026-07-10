import { useState, useEffect } from 'react';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const fmt = (n) => (n || 0).toLocaleString() + ' EGP';

const EARNINGS = [
  ['Base Salary', 'baseSalary'],
  ['Transport Allowance', 'transportAllowance'],
  ['Housing Allowance', 'housingAllowance'],
  ['Meal Allowance', 'mealAllowance'],
  ['Mobile Allowance', 'mobileAllowance'],
  ['Fuel Allowance', 'fuelAllowance'],
  ['Overtime', 'overtimeAmount'],
  ['Shift Allowance', 'shiftAllowance'],
  ['Commission', 'commissionAmount'],
  ['Performance Bonus', 'performanceBonus'],
  ['Attendance Bonus', 'attendanceBonus'],
  ['Holiday Bonus', 'holidayBonus'],
  ['Other Bonus', 'otherBonus'],
];

const DEDUCTIONS = [
  ['Income Tax', 'incomeTax'],
  ['Social Insurance', 'socialInsurance'],
  ['Pension', 'pension'],
  ['Loan Deduction', 'loanDeduction'],
  ['Salary Advance', 'advanceDeduction'],
  ['Leave Without Pay', 'leaveWithoutPay'],
  ['Other Deductions', 'otherDeductions'],
];

const STATUS_COLOR = {
  Paid: { color: '#047857', bg: 'rgba(16,185,129,0.12)' },
  Approved: { color: '#2563EB', bg: 'rgba(37,99,235,0.12)' },
  Pending: { color: '#B45309', bg: 'rgba(245,158,11,0.12)' },
  Failed: { color: '#B91C1C', bg: 'rgba(239,68,68,0.12)' },
  'On Hold': { color: '#64748B', bg: 'rgba(100,116,139,0.12)' },
};

const CARD_STATUS_COLOR = {
  Pending:  { color: '#B45309', bg: 'rgba(245,158,11,0.12)' },
  Approved: { color: '#047857', bg: 'rgba(16,185,129,0.12)' },
  Rejected: { color: '#B91C1C', bg: 'rgba(239,68,68,0.12)' },
};

const MyPayrollPage = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState('payslips');
  const [payslips, setPayslips] = useState([]);
  const [history, setHistory] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  // Payment method state
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [pmLoading, setPmLoading] = useState(false);
  const [pmForm, setPmForm] = useState({ cardholderName: '', cardType: 'Visa', cardNumber: '', expiryMonth: '', expiryYear: '' });
  const [pmSubmitting, setPmSubmitting] = useState(false);
  const [pmMsg, setPmMsg] = useState({ type: '', text: '' });
  const [editingId, setEditingId] = useState(null); // null = new card, string = editing existing

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [p, h] = await Promise.all([
          API.get('/ess/payroll/payslips'),
          API.get('/ess/payroll/history'),
        ]);
        setPayslips(p.data.data || []);
        setHistory(h.data.data || { history: [], totals: {}, ytdNet: 0, count: 0 });
        setSelected((p.data.data || [])[0] || null);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  useEffect(() => {
    if (tab === 'payment') fetchPaymentMethods();
  }, [tab]);

  const fetchPaymentMethods = async () => {
    setPmLoading(true);
    try {
      const { data } = await API.get('/ess/payment-methods');
      setPaymentMethods(data.data || []);
    } catch (e) { console.error(e); } finally { setPmLoading(false); }
  };

  const handlePmSubmit = async (e) => {
    e.preventDefault();
    setPmMsg({ type: '', text: '' });

    // Frontend validations
    const cleaned = pmForm.cardNumber.replace(/\s/g, '');
    if (!/^\d+$/.test(cleaned)) return setPmMsg({ type: 'error', text: 'Card number must contain digits only.' });
    if (cleaned.length < 13 || cleaned.length > 19) return setPmMsg({ type: 'error', text: 'Card number must be 13–19 digits.' });
    if (!/^\d{1,2}$/.test(pmForm.expiryMonth)) return setPmMsg({ type: 'error', text: 'Expiry month must be numbers only (01–12).' });
    if (!/^\d{4}$/.test(pmForm.expiryYear)) return setPmMsg({ type: 'error', text: 'Expiry year must be 4 digits.' });
    const month = parseInt(pmForm.expiryMonth, 10);
    if (month < 1 || month > 12) return setPmMsg({ type: 'error', text: 'Expiry month must be between 01 and 12.' });
    const now = new Date();
    const expiry = new Date(parseInt(pmForm.expiryYear, 10), month - 1, 1);
    if (expiry < new Date(now.getFullYear(), now.getMonth(), 1)) return setPmMsg({ type: 'error', text: 'Card has already expired.' });

    setPmSubmitting(true);
    try {
      if (editingId) {
        await API.put(`/ess/payment-methods/${editingId}`, pmForm);
        setPmMsg({ type: 'success', text: 'Card updated and resubmitted for approval.' });
      } else {
        await API.post('/ess/payment-methods', pmForm);
        setPmMsg({ type: 'success', text: 'Card submitted for payroll team approval.' });
      }
      setPmForm({ cardholderName: '', cardType: 'Visa', cardNumber: '', expiryMonth: '', expiryYear: '' });
      setEditingId(null);
      fetchPaymentMethods();
    } catch (err) {
      setPmMsg({ type: 'error', text: err.response?.data?.message || 'Submission failed.' });
    } finally { setPmSubmitting(false); }
  };

  const startEdit = (pm) => {
    setEditingId(pm._id);
    setPmForm({ cardholderName: pm.cardholderName, cardType: pm.cardType, cardNumber: '', expiryMonth: pm.expiryMonth, expiryYear: pm.expiryYear });
    setPmMsg({ type: '', text: '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setPmForm({ cardholderName: '', cardType: 'Visa', cardNumber: '', expiryMonth: '', expiryYear: '' });
    setPmMsg({ type: '', text: '' });
  };

  const handlePmDelete = async (id) => {
    if (!window.confirm('Remove this pending card?')) return;
    try {
      await API.delete(`/ess/payment-methods/${id}`);
      fetchPaymentMethods();
    } catch (e) { alert(e.response?.data?.message || 'Failed to remove.'); }
  };

  // Bank account (vendor-aware) state
  const [vendors, setVendors] = useState([]);
  const [myBank, setMyBank] = useState(null);
  const [baLoading, setBaLoading] = useState(false);
  const [baForm, setBaForm] = useState({ vendor: 'Fawry', method: 'BankAccount', bankName: '', accountName: '', accountNumber: '', iban: '', swiftCode: '', branchCode: '', fawryMobile: '', paymobWallet: '' });
  const [baMsg, setBaMsg] = useState({ type: '', text: '' });
  const [baErrors, setBaErrors] = useState([]);

  useEffect(() => {
    if (tab === 'bank') fetchBank();
  }, [tab]);

  const fetchBank = async () => {
    setBaLoading(true);
    try {
      const [acc, ven] = await Promise.all([
        API.get('/gateway/bank-accounts'),
        API.get('/gateway/vendors'),
      ]);
      const list = acc.data.data || [];
      const mine = list[0] || null;
      setMyBank(mine);
      setVendors(ven.data.data || []);
      if (mine) {
        setBaForm({
          vendor: mine.preferredGateway || 'Fawry',
          method: mine.disbursementMethod || 'BankAccount',
          bankName: mine.bankName || '', accountName: mine.accountName || '',
          accountNumber: '', iban: '', swiftCode: mine.swiftCode || '', branchCode: '',
          fawryMobile: '', paymobWallet: '',
        });
      }
    } catch (e) { console.error(e); } finally { setBaLoading(false); }
  };

  const vendorOf = (key) => vendors.find(v => v.key === key) || { methods: ['BankAccount'], fields: {} };

  const handleBaSave = async () => {
    setBaErrors([]);
    try {
      await API.post('/gateway/bank-accounts', {
        preferredGateway: baForm.vendor,
        disbursementMethod: baForm.method,
        bankName: baForm.bankName,
        accountName: baForm.accountName,
        accountNumber: baForm.accountNumber || undefined,
        iban: baForm.iban || undefined,
        swiftCode: baForm.swiftCode || undefined,
        branchCode: baForm.branchCode || undefined,
        fawryMobile: baForm.fawryMobile || undefined,
        paymobWallet: baForm.paymobWallet || undefined,
      });
      setBaMsg({ type: 'success', text: 'Bank account saved and submitted for HR verification.' });
      fetchBank();
    } catch (e) {
      if (e.response?.data?.errors) setBaErrors(e.response.data.errors);
      setBaMsg({ type: 'error', text: e.response?.data?.message || 'Failed to save bank account.' });
    }
  };

  const latest = payslips[0];
  const totals = history?.totals || { gross: 0, deductions: 0, net: 0 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Payroll</h1>
          <p className="page-subtitle">Your payslips and payment history — private to you</p>
        </div>
      </div>

      {/* Summary tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <div className="card">
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Latest Net</div>
          <div style={{ fontWeight: 700, fontSize: 20, marginTop: 4 }}>{latest ? fmt(latest.netSalary) : '—'}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{latest?.period || 'No payslips'}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paid (all)</div>
          <div style={{ fontWeight: 700, fontSize: 20, marginTop: 4, color: 'var(--accent-success)' }}>{fmt(totals.net)}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>YTD Net</div>
          <div style={{ fontWeight: 700, fontSize: 20, marginTop: 4 }}>{fmt(history?.ytdNet)}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payslips</div>
          <div style={{ fontWeight: 700, fontSize: 20, marginTop: 4 }}>{payslips.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 0, overflowX: 'auto' }}>
        {[
          { id: 'payslips', label: '📄 Payslips' },
          { id: 'history', label: '🧾 Payment History' },
          { id: 'bank', label: '🏦 Bank Account' },
          { id: 'payment', label: '💳 Payment Method' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: 'transparent', border: 'none',
              borderBottom: tab === t.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
              color: tab === t.id ? 'var(--accent-primary)' : 'var(--text-muted)',
              fontWeight: tab === t.id ? 600 : 400, fontSize: 13, cursor: 'pointer',
              padding: '10px 18px', fontFamily: 'inherit', whiteSpace: 'nowrap', marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && tab !== 'payment' ? (
        <div className="loading-state"><div className="spinner" /> Loading payroll…</div>
      ) : tab === 'payment' ? (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Add / Edit Card Form */}
          <div style={{ flex: '1 1 320px' }}>
            <div className="card">
              <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>{editingId ? '✏️ Edit Card' : 'Add Payment Card'}</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                {editingId ? 'Update your card details. It will be resubmitted for payroll team approval.' : 'Your card details will be reviewed and approved by the payroll team before use.'}
              </p>
              <form onSubmit={handlePmSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Cardholder Name</label>
                  <input className="form-input" value={pmForm.cardholderName} onChange={e => setPmForm(f => ({ ...f, cardholderName: e.target.value }))} placeholder="Name on card" required />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Card Type</label>
                  <select className="form-input" value={pmForm.cardType} onChange={e => setPmForm(f => ({ ...f, cardType: e.target.value }))}>
                    <option>Visa</option>
                    <option>Mastercard</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Card Number {editingId && <span style={{ color: 'var(--accent-warning)', fontSize: 11 }}>(enter full number to update)</span>}</label>
                  <input
                    className="form-input"
                    value={pmForm.cardNumber}
                    onChange={e => setPmForm(f => ({ ...f, cardNumber: e.target.value.replace(/\D/g, '').slice(0, 19) }))}
                    placeholder="Numbers only, 13–19 digits"
                    inputMode="numeric"
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Expiry Month</label>
                    <input
                      className="form-input"
                      value={pmForm.expiryMonth}
                      onChange={e => setPmForm(f => ({ ...f, expiryMonth: e.target.value.replace(/\D/g, '').slice(0, 2) }))}
                      placeholder="MM"
                      inputMode="numeric"
                      maxLength={2}
                      required
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Expiry Year</label>
                    <input
                      className="form-input"
                      value={pmForm.expiryYear}
                      onChange={e => setPmForm(f => ({ ...f, expiryYear: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                      placeholder="YYYY"
                      inputMode="numeric"
                      maxLength={4}
                      required
                    />
                  </div>
                </div>
                {pmMsg.text && (
                  <div style={{ padding: '8px 12px', borderRadius: 8, fontSize: 12, background: pmMsg.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: pmMsg.type === 'error' ? '#B91C1C' : '#047857' }}>
                    {pmMsg.text}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="btn btn-primary" disabled={pmSubmitting} style={{ flex: 1 }}>
                    {pmSubmitting ? 'Submitting…' : editingId ? 'Update & Resubmit' : 'Submit for Approval'}
                  </button>
                  {editingId && (
                    <button type="button" className="btn btn-secondary" onClick={cancelEdit}>Cancel</button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Existing Cards */}
          <div style={{ flex: '1 1 320px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15 }}>My Cards</h3>
            {pmLoading ? (
              <div className="loading-state"><div className="spinner" /> Loading…</div>
            ) : paymentMethods.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No cards added yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {paymentMethods.map(pm => {
                  const sc = CARD_STATUS_COLOR[pm.status] || CARD_STATUS_COLOR.Pending;
                  const isBeingEdited = editingId === pm._id;
                  return (
                    <div key={pm._id} style={{ background: isBeingEdited ? 'rgba(37,99,235,0.06)' : 'var(--bg-card)', border: isBeingEdited ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px 18px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{pm.cardType} •••• {pm.lastFour}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{pm.cardholderName} · Exp {pm.expiryMonth}/{pm.expiryYear}</div>
                          {pm.status === 'Rejected' && pm.rejectionReason && (
                            <div style={{ fontSize: 12, color: '#B91C1C', marginTop: 4 }}>Reason: {pm.rejectionReason}</div>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                          <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color }}>{pm.status}</span>
                          {pm.isActive && <span style={{ fontSize: 11, color: '#047857' }}>✓ Active</span>}
                          <div style={{ display: 'flex', gap: 6 }}>
                            {!isBeingEdited && (
                              <button onClick={() => startEdit(pm)} className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: '3px 8px' }}>Edit</button>
                            )}
                            {pm.status === 'Pending' && !isBeingEdited && (
                              <button onClick={() => handlePmDelete(pm._id)} className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: '3px 8px', color: 'var(--accent-danger)' }}>Remove</button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : tab === 'payslips' ? (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* List */}
          <div style={{ flex: '1 1 320px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15 }}>Payslip History</h3>
            {payslips.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                No payslips available yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {payslips.map(p => {
                  const sc = STATUS_COLOR[p.status] || STATUS_COLOR.Pending;
                  const isSel = selected?._id === p._id;
                  return (
                    <div key={p._id} onClick={() => setSelected(p)} style={{
                      background: isSel ? 'rgba(37,99,235,0.08)' : 'var(--bg-card)',
                      border: isSel ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)', padding: '14px 18px', cursor: 'pointer',
                      transition: 'var(--transition)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{p.period}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Net: {fmt(p.netSalary)}</div>
                      </div>
                      <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color }}>
                        {p.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail */}
          {selected && (
            <div style={{ flex: '1 1 360px' }}>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payslip</div>
                    <div style={{ fontWeight: 700, fontSize: 20 }}>{selected.period}</div>
                  </div>
                  <button onClick={() => window.print()} className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}>🖨️ Print</button>
                </div>

                <Section title="Earnings" color="var(--accent-success)" rows={EARNINGS} data={selected} />
                <Section title="Deductions" color="var(--accent-danger)" rows={DEDUCTIONS} data={selected} />

                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Net Salary</div>
                    <div style={{ fontWeight: 700, fontSize: 24 }}>{fmt(selected.netSalary)}</div>
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: (STATUS_COLOR[selected.status] || STATUS_COLOR.Pending).bg, color: (STATUS_COLOR[selected.status] || STATUS_COLOR.Pending).color }}>
                    {selected.status}
                  </span>
                </div>
                {selected.paymentDate && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                    Paid on {new Date(selected.paymentDate).toLocaleDateString()}
                    {selected.paymentRef ? ` · Ref ${selected.paymentRef}` : ''}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
       ) : tab === 'bank' ? (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 360px' }}>
            <div className="card">
              <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>{myBank ? 'Update Your Bank Account' : 'Add Your Bank Account'}</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                Choose the payment vendor your salary is paid through. Required details depend on the vendor (Fawry, PayMob, InstaPay, …). HR must verify before use.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Payment Vendor</label>
                  <select className="form-input" value={baForm.vendor} onChange={e => setBaForm(f => ({ ...f, vendor: e.target.value, method: vendorOf(e.target.value).methods[0] }))}>
                    {vendors.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Method</label>
                  <select className="form-input" value={baForm.method} onChange={e => setBaForm(f => ({ ...f, method: e.target.value }))}>
                    {vendorOf(baForm.vendor).methods.map(m => <option key={m} value={m}>{m === 'BankAccount' ? 'Bank Account' : m}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                {Object.entries((vendorOf(baForm.vendor).fields || {})[baForm.method] || {}).map(([field, rule]) => {
                  const labelMap = { accountName: 'Account Holder', bankName: 'Bank Name', accountNumber: 'Account Number', iban: 'IBAN', swiftCode: 'SWIFT', branchCode: 'Branch Code', fawryMobile: 'Fawry Mobile', paymobWallet: 'PayMob Wallet' };
                  const req = rule.required ? ' *' : (rule.eitherOf ? ` (or ${rule.eitherOf})` : '');
                  return (
                    <div key={field}>
                      <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{(labelMap[field] || field) + req}</label>
                      <input className="form-input" value={baForm[field] || ''} onChange={e => setBaForm(f => ({ ...f, [field]: e.target.value }))} placeholder={labelMap[field] || field} />
                    </div>
                  );
                })}
              </div>
              {baErrors.length > 0 && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: 10, marginTop: 12 }}>
                  {baErrors.map((err, i) => <div key={i} style={{ fontSize: 12, color: '#B91C1C' }}>⚠️ {err}</div>)}
                </div>
              )}
              {baMsg.text && (
                <div style={{ padding: '8px 12px', borderRadius: 8, fontSize: 12, marginTop: 12, background: baMsg.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: baMsg.type === 'error' ? '#B91C1C' : '#047857' }}>{baMsg.text}</div>
              )}
              <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={handleBaSave} disabled={baLoading}>💾 Save Bank Account</button>
            </div>
          </div>
          <div style={{ flex: '1 1 320px' }}>
            <div className="card">
              <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Current Status</h3>
              {baLoading ? <div className="loading-state">Loading…</div>
              : myBank ? (
                <div>
                  <div style={{ fontSize: 13 }}><strong>Vendor:</strong> {myBank.preferredGateway}</div>
                  <div style={{ fontSize: 13 }}><strong>Method:</strong> {myBank.disbursementMethod}</div>
                  <div style={{ fontSize: 13 }}><strong>Bank:</strong> {myBank.bankName}</div>
                  <div style={{ fontSize: 13 }}><strong>Account:</strong> <span style={{ fontFamily: 'monospace' }}>{myBank.accountNumber || myBank.iban || '—'}</span></div>
                  <div style={{ fontSize: 13, marginTop: 6, color: myBank.isVerified ? '#047857' : '#B45309' }}>{myBank.isVerified ? '✓ Verified by HR' : '⏳ Pending HR verification'}</div>
                </div>
              ) : <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No bank account on file yet.</div>}
            </div>
          </div>
        </div>
       ) : (
        <div className="card">
          <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>Payment History</h3>
          {!history || history.history.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No payment records yet.</div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Period</th><th>Gross</th><th>Deductions</th><th>Net</th><th>Status</th><th>Paid On</th></tr>
                </thead>
                <tbody>
                  {history.history.map(h => (
                    <tr key={h._id}>
                      <td style={{ fontWeight: 600 }}>{h.period}</td>
                      <td>{fmt(h.grossEarnings)}</td>
                      <td style={{ color: 'var(--accent-danger)' }}>{fmt(h.totalDeductions)}</td>
                      <td style={{ fontWeight: 700 }}>{fmt(h.netSalary)}</td>
                      <td>
                        <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: (STATUS_COLOR[h.status] || STATUS_COLOR.Pending).bg, color: (STATUS_COLOR[h.status] || STATUS_COLOR.Pending).color }}>
                          {h.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{h.paymentDate ? new Date(h.paymentDate).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Section = ({ title, color, rows, data }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 11, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{title}</div>
    {rows.filter(([, k]) => (data[k] || 0) > 0).map(([label, k]) => (
      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span>{fmt(data[k])}</span>
      </div>
    ))}
    <div style={{ borderTop: '1px solid var(--border-color)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
      <span>Total {title}</span>
      <span style={{ color }}>
        {title === 'Earnings'
          ? fmt(rows.reduce((s, [, k]) => s + (data[k] || 0), 0))
          : fmt(rows.reduce((s, [, k]) => s + (data[k] || 0), 0))}
      </span>
    </div>
  </div>
);

export default MyPayrollPage;
