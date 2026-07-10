import { useState, useEffect, useRef } from 'react';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ─────────────────────────────────────────────────────────────────
// RBAC
// ─────────────────────────────────────────────────────────────────
const PAYROLL_ROLES = [
  'Payroll Specialist',
  'HR Manager',
  'HR Director / Executive HR User',
  'HRM System Administrator',
  'Super CRM Administrator',
];
const isPayrollMgr = (role) => PAYROLL_ROLES.includes(role);

// ─────────────────────────────────────────────────────────────────
// STATUS COLOR MAPS (match the project design system)
// ─────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  Draft:          { bg: 'rgba(148,163,184,0.15)', text: '#64748B', border: '#94A3B833' },
  Processing:     { bg: 'rgba(245,158,11,0.12)',  text: '#B45309', border: '#F59E0B33' },
  Approved:       { bg: 'rgba(37,99,235,0.12)',   text: '#2563EB', border: '#2563EB33' },
  PendingRelease: { bg: 'rgba(245,158,11,0.15)',  text: '#92400E', border: '#F59E0B55' },
  Released:       { bg: 'rgba(16,185,129,0.12)',  text: '#047857', border: '#10B98133' },
  Archived:       { bg: 'rgba(100,116,139,0.12)', text: '#64748B', border: '#64748B33' },
  Submitted:  { bg: 'rgba(37,99,235,0.12)',   text: '#2563EB', border: '#2563EB33' },
  Pending:    { bg: 'rgba(245,158,11,0.12)',  text: '#B45309', border: '#F59E0B33' },
  Active:     { bg: 'rgba(16,185,129,0.12)',  text: '#047857', border: '#10B98133' },
  Settled:    { bg: 'rgba(37,99,235,0.12)',   text: '#2563EB', border: '#2563EB33' },
  Defaulted:  { bg: 'rgba(239,68,68,0.12)',   text: '#B91C1C', border: '#EF444433' },
  Open:       { bg: 'rgba(239,68,68,0.12)',   text: '#B91C1C', border: '#EF444433' },
  Resolved:   { bg: 'rgba(16,185,129,0.12)',  text: '#047857', border: '#10B98133' },
  Acknowledged:{ bg: 'rgba(245,158,11,0.12)', text: '#B45309', border: '#F59E0B33' },
};

const runStatusClr = STATUS_COLORS;

const sev = {
  Critical: { bg: 'rgba(239,68,68,0.12)',  text: '#B91C1C', border: '#EF444433', dot: '#EF4444' },
  High:     { bg: 'rgba(245,158,11,0.12)', text: '#B45309', border: '#F59E0B33', dot: '#F59E0B' },
  Medium:   { bg: 'rgba(37,99,235,0.12)',  text: '#2563EB', border: '#2563EB33', dot: '#2563EB' },
  Low:      { bg: 'rgba(16,185,129,0.12)', text: '#047857', border: '#10B98133', dot: '#10B981' },
};

const alertTypeClr = {
  Fraud:          { icon: '🚨', color: '#EF4444' },
  Anomaly:        { icon: '⚠️',  color: '#F59E0B' },
  Compliance:     { icon: '⚖️',  color: '#2563EB' },
  Recommendation: { icon: '💡', color: '#10B981' },
  Info:           { icon: 'ℹ️',  color: '#64748B' },
};

// ─────────────────────────────────────────────────────────────────
// MICRO-COMPONENTS
// ─────────────────────────────────────────────────────────────────

const Badge = ({ label, color, bg, border }) => (
  <span style={{
    display: 'inline-block', padding: '3px 10px', borderRadius: 12,
    fontSize: 11, fontWeight: 600, lineHeight: 1.4,
    background: bg, color, border: `1px solid ${border}`,
  }}>{label}</span>
);

const MetricCard = ({ icon, label, value, sub }) => (
  <div className="card" style={{
    padding: '18px 20px',
    flex: '1 1 180px', minWidth: 160,
  }}>
    <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
  </div>
);

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
const PayrollPage = () => {
  const { user } = useAuth();
  const isMgr = isPayrollMgr(user?.role);
  const isSenior = ['HR Manager', 'HR Director / Executive HR User', 'HRM System Administrator', 'Super CRM Administrator'].includes(user?.role);

  // ── Tab State ──
  const TABS = [
    { id: 'payslips',            label: '📄 My Payslips',         visible: true },
    { id: 'runs',                label: '🔄 Payroll Runs',         visible: isMgr },
    { id: 'disbursement-queue',  label: '💸 Disbursement Queue',   visible: isMgr },
    { id: 'payment-methods',     label: '💳 Payment Methods',      visible: isMgr },
    { id: 'company-accounts',    label: '🏦 Company Accounts',     visible: isMgr },
    { id: 'bank-accounts',       label: '👤 Employee Banks',      visible: isMgr },
    { id: 'alerts',              label: '🚨 Alerts & Fraud',       visible: isMgr },
    { id: 'analytics',           label: '📊 Analytics',            visible: isMgr },
  ].filter(t => t.visible);

  const [activeTab, setActiveTab] = useState('payslips');

  // ── Payslips ──
  const [payslips, setPayslips]   = useState([]);
  const [payslipsLoading, setPayslipsLoading] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);

  // ── Payroll Runs ──
  const [runs, setRuns]       = useState([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);
  const [runEntries, setRunEntries]   = useState([]);
  const [runEntriesLoading, setRunEntriesLoading] = useState(false);
  const [runPeriod, setRunPeriod] = useState(new Date().toISOString().substring(0, 7));
  const [runType, setRunType] = useState('Salary');
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusNote, setBonusNote] = useState('');
  const [generatingRun, setGeneratingRun] = useState(false);
  const [runMsg, setRunMsg] = useState({ type: '', text: '' });

  // ── Alerts ──
  const [alerts, setAlerts]         = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertFilter, setAlertFilter] = useState('All');
  const [alertSeverityFilter, setAlertSeverityFilter] = useState('All');

  // ── Analytics ──
  const [analytics, setAnalytics]   = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // ── Payment Methods ──
  const [pmList, setPmList] = useState([]);
  const [pmLoading, setPmLoading] = useState(false);
  const [pmFilter, setPmFilter] = useState('Pending');
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // ── Disbursement Queue ──
  const [dqList, setDqList] = useState([]);
  const [dqLoading, setDqLoading] = useState(false);

  // ── Company Source Bank Accounts ──
  const [companyAccounts, setCompanyAccounts] = useState([]);
  const [caLoading, setCaLoading] = useState(false);
  const [caForm, setCaForm] = useState({ open: false, editing: null, nickname: '', bankName: '', branchName: '', accountName: '', accountNumber: '', iban: '', swiftCode: '', disbursementProvider: 'Fawry', monthlyLimit: '', isDefault: false, notes: '' });
  const [caMsg, setCaMsg] = useState({ type: '', text: '' });

  // ── Release confirmation modal ──
  const [releaseModal, setReleaseModal] = useState({ open: false, runId: null, isPending: false, readiness: null, sourceAccountId: '', mode: 'simulation', loading: false });

  // ── Employee Bank Accounts (vendor-aware) ──
  const [bankAccounts, setBankAccounts] = useState([]);
  const [baLoading, setBaLoading] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [baForm, setBaForm] = useState({ open: false, editing: null, employeeId: '', vendor: 'Fawry', method: 'BankAccount', bankName: '', accountName: '', accountNumber: '', iban: '', swiftCode: '', branchCode: '', fawryMobile: '', paymobWallet: '' });
  const [baMsg, setBaMsg] = useState({ type: '', text: '' });
  const [baErrors, setBaErrors] = useState([]);

  // ── Fetch on tab switch ──
  useEffect(() => {
    if (activeTab === 'payslips'           && !payslips.length) fetchPayslips();
    if (activeTab === 'runs'               && !runs.length)    fetchRuns();
    if (activeTab === 'disbursement-queue')                    fetchDisbursementQueue();
    if (activeTab === 'payment-methods')                       fetchPmList();
    if (activeTab === 'company-accounts')                      fetchCompanyAccounts();
    if (activeTab === 'bank-accounts')                         fetchBankAccounts();
    if (activeTab === 'alerts'             && !alerts.length)  fetchAlerts();
    if (activeTab === 'analytics'          && !analytics)      fetchAnalytics();
  }, [activeTab]);

  // ─── API CALLS ───────────────────────────────────────────────

  const fetchDisbursementQueue = async () => {
    setDqLoading(true);
    try {
      const { data } = await API.get('/payroll/disbursement-queue');
      setDqList(data.data || []);
    } catch (e) { console.error(e); } finally { setDqLoading(false); }
  };

  const handleRetry = async (entryId) => {
    try {
      await API.put(`/payroll/entries/${entryId}/retry`);
      setDqList(prev => prev.filter(e => e._id !== entryId));
    } catch (e) { alert(e.response?.data?.message || 'Retry failed.'); }
  };

  const fetchPmList = async () => {
    setPmLoading(true);
    try {
      const { data } = await API.get(`/payroll/payment-methods?status=${pmFilter}`);
      setPmList(data.data || []);
    } catch (e) { console.error(e); } finally { setPmLoading(false); }
  };

  const handlePmApprove = async (id) => {
    try {
      await API.put(`/payroll/payment-methods/${id}/approve`);
      fetchPmList();
    } catch (e) { alert(e.response?.data?.message || 'Failed.'); }
  };

  const handlePmReject = async () => {
    try {
      await API.put(`/payroll/payment-methods/${rejectModal}/reject`, { reason: rejectReason });
      setRejectModal(null);
      setRejectReason('');
      fetchPmList();
    } catch (e) { alert(e.response?.data?.message || 'Failed.'); }
  };

  const fetchPayslips = async () => {
    setPayslipsLoading(true);
    try {
      const { data } = await API.get('/payroll/entries/my');
      setPayslips(data.data || []);
    } catch (e) { console.error(e); } finally { setPayslipsLoading(false); }
  };

  const fetchRuns = async () => {
    setRunsLoading(true);
    try {
      const { data } = await API.get('/payroll/runs');
      setRuns(data.data || []);
    } catch (e) { console.error(e); } finally { setRunsLoading(false); }
  };

  const fetchRunEntries = async (runId) => {
    setRunEntriesLoading(true);
    try {
      const { data } = await API.get(`/payroll/runs/${runId}/entries`);
      setRunEntries(data.data || []);
    } catch (e) { console.error(e); } finally { setRunEntriesLoading(false); }
  };

  const fetchAlerts = async () => {
    setAlertsLoading(true);
    try {
      const { data } = await API.get('/payroll/alerts');
      setAlerts(data.data || []);
    } catch (e) { console.error(e); } finally { setAlertsLoading(false); }
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const { data } = await API.get('/payroll/analytics');
      setAnalytics(data.data);
    } catch (e) { console.error(e); } finally { setAnalyticsLoading(false); }
  };

  // ─── COMPANY ACCOUNTS ───────────────────────────────────────

  const fetchCompanyAccounts = async () => {
    setCaLoading(true);
    try {
      const { data } = await API.get('/gateway/company-accounts');
      setCompanyAccounts(data.data || []);
    } catch (e) { console.error(e); } finally { setCaLoading(false); }
  };

  const handleCaSave = async () => {
    try {
      const body = { ...caForm };
      if (!caForm.editing) delete body.editing;
      if (!caForm.open) delete body.open;
      await API.post('/gateway/company-accounts', {
        _id: caForm.editing || undefined,
        nickname: caForm.nickname,
        bankName: caForm.bankName,
        branchName: caForm.branchName || undefined,
        accountName: caForm.accountName,
        accountNumber: caForm.accountNumber || undefined,
        iban: caForm.iban || undefined,
        swiftCode: caForm.swiftCode || undefined,
        disbursementProvider: caForm.disbursementProvider,
        monthlyLimit: caForm.monthlyLimit ? Number(caForm.monthlyLimit) : 0,
        isDefault: !!caForm.isDefault,
        notes: caForm.notes || '',
      });
      setCaMsg({ type: 'success', text: 'Company account saved.' });
      setCaForm({ open: false, editing: null, nickname: '', bankName: '', branchName: '', accountName: '', accountNumber: '', iban: '', swiftCode: '', disbursementProvider: 'Fawry', monthlyLimit: '', isDefault: false, notes: '' });
      fetchCompanyAccounts();
    } catch (e) { setCaMsg({ type: 'error', text: e.response?.data?.message || 'Failed.' }); }
  };

  const handleCaDelete = async (id) => {
    if (!window.confirm('Delete this company account?')) return;
    try { await API.delete(`/gateway/company-accounts/${id}`); fetchCompanyAccounts(); } catch (e) { alert(e.response?.data?.message || 'Failed.'); }
  };

  const handleCaVerify = async (id) => {
    try { await API.put(`/gateway/company-accounts/${id}/verify`); fetchCompanyAccounts(); } catch (e) { alert(e.response?.data?.message || 'Failed.'); }
  };

  // ─── EMPLOYEE BANK ACCOUNTS (vendor-aware) ───────────────────

  const fetchBankAccounts = async () => {
    setBaLoading(true);
    try {
      const [acc, ven] = await Promise.all([
        API.get('/gateway/bank-accounts'),
        API.get('/gateway/vendors'),
      ]);
      setBankAccounts(acc.data.data || []);
      setVendors(ven.data.data || []);
    } catch (e) { console.error(e); } finally { setBaLoading(false); }
  };

  const vendorOf = (key) => vendors.find(v => v.key === key) || { methods: ['BankAccount'], fields: {} };

  const handleBaOpen = (acc) => {
    if (acc) {
      setBaForm({
        open: true, editing: acc._id, employeeId: acc.employeeId?._id || acc.employeeId,
        vendor: acc.preferredGateway || 'Fawry', method: acc.disbursementMethod || 'BankAccount',
        bankName: acc.bankName || '', accountName: acc.accountName || '', accountNumber: '', iban: '',
        swiftCode: acc.swiftCode || '', branchCode: '', fawryMobile: '', paymobWallet: '',
      });
    } else {
      setBaForm({ open: true, editing: null, employeeId: '', vendor: 'Fawry', method: 'BankAccount', bankName: '', accountName: '', accountNumber: '', iban: '', swiftCode: '', branchCode: '', fawryMobile: '', paymobWallet: '' });
    }
    setBaMsg({ type: '', text: '' });
    setBaErrors([]);
  };

  const handleBaSave = async () => {
    setBaErrors([]);
    try {
      await API.post('/gateway/bank-accounts', {
        employeeId: baForm.employeeId || undefined,
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
      setBaMsg({ type: 'success', text: 'Bank account saved.' });
      setBaForm({ ...baForm, open: false });
      fetchBankAccounts();
    } catch (e) {
      if (e.response?.data?.errors) setBaErrors(e.response.data.errors);
      setBaMsg({ type: 'error', text: e.response?.data?.message || 'Failed to save bank account.' });
    }
  };

  const handleBaDelete = async (id) => {
    if (!window.confirm('Delete this employee bank account?')) return;
    try { await API.delete(`/gateway/bank-accounts/${id}`); fetchBankAccounts(); } catch (e) { alert(e.response?.data?.message || 'Failed.'); }
  };

  const handleBaVerify = async (id) => {
    try { await API.put(`/gateway/bank-accounts/${id}/verify`); fetchBankAccounts(); } catch (e) { alert(e.response?.data?.message || 'Failed.'); }
  };

  // ─── RELEASE CONFIRMATION MODAL ──────────────────────────────

  const openReleaseModal = async (runId, isPending) => {
    try {
      if (!companyAccounts.length) {
        try { const { data } = await API.get('/gateway/company-accounts'); setCompanyAccounts(data.data || []); } catch (_) {}
      }
      const { data } = await API.get(`/gateway/runs/${runId}/readiness`);
      setReleaseModal({
        open: true, runId, isPending,
        readiness: data.data,
        sourceAccountId: data.data.sourceAccount?._id || (companyAccounts[0]?._id || ''),
        mode: data.data.disbursementMode || 'simulation',
        loading: false,
      });
    } catch (e) { alert(e.response?.data?.message || 'Could not load readiness.'); }
  };

  const confirmRelease = async () => {
    setReleaseModal(prev => ({ ...prev, loading: true }));
    try {
      await API.put(`/payroll/runs/${releaseModal.runId}/release`, {
        sourceAccountId: releaseModal.sourceAccountId || undefined,
        disbursementMode: releaseModal.mode,
      });
      setReleaseModal({ open: false, runId: null, isPending: false, readiness: null, sourceAccountId: '', mode: 'simulation', loading: false });
      fetchRuns();
    } catch (e) { alert(e.response?.data?.message || 'Release failed.'); setReleaseModal(prev => ({ ...prev, loading: false })); }
  };

  // ─── PAYROLL RUN ACTIONS ─────────────────────────────────────

  const handleGenerateRun = async () => {
    if (!runPeriod) return;
    if (runType === 'Bonus' && (!bonusAmount || Number(bonusAmount) <= 0)) {
      setRunMsg({ type: 'error', text: 'Enter a bonus amount per employee.' });
      return;
    }
    setGeneratingRun(true);
    setRunMsg({ type: '', text: '' });
    try {
      const { data } = await API.post('/payroll/runs', {
        period: runPeriod,
        type: runType,
        bonusAmount: runType === 'Bonus' ? Number(bonusAmount) : undefined,
        bonusNote: runType === 'Bonus' ? bonusNote : undefined,
      });
      setRunMsg({ type: 'success', text: data.message });
      fetchRuns();
    } catch (e) {
      setRunMsg({ type: 'error', text: e.response?.data?.message || 'Failed to generate run.' });
    } finally { setGeneratingRun(false); }
  };

  const handleApproveRun = async (runId) => {
    try {
      await API.put(`/payroll/runs/${runId}/approve`);
      fetchRuns();
      if (selectedRun?._id === runId) setSelectedRun(prev => ({ ...prev, status: 'Approved' }));
    } catch (e) { alert(e.response?.data?.message || 'Approval failed.'); }
  };

  const handleReleaseRun = (runId, isPending) => {
    openReleaseModal(runId, isPending);
  };

  // ─── ALERT ACTIONS ───────────────────────────────────────────

  const handleAlertStatus = async (alertId, status) => {
    try {
      await API.put(`/payroll/alerts/${alertId}/status`, { status });
      setAlerts(prev => prev.map(a => a._id === alertId ? { ...a, status } : a));
    } catch (e) { console.error(e); }
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER — MY PAYSLIPS TAB
  // ─────────────────────────────────────────────────────────────

  const renderPayslips = () => (
    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      {/* Payslip list */}
      <div style={{ flex: '1 1 320px' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 15 }}>Payslip History</h3>
        {payslipsLoading ? (
          <div className="loading-state">Loading payslips…</div>
        ) : payslips.length === 0 ? (
          <div className="card" style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
            <div>No payslips found yet. Payslips appear here once payroll is processed.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {payslips.map(p => {
              const s = runStatusClr[p.status] || runStatusClr.Draft;
              const isSelected = selectedPayslip?._id === p._id;
              return (
                <div key={p._id} onClick={() => setSelectedPayslip(p)} style={{
                  background: isSelected ? 'rgba(37,99,235,0.08)' : 'var(--bg-card)',
                  border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)', padding: '14px 18px', cursor: 'pointer',
                  transition: 'var(--transition)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.period}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Gross: {(p.grossEarnings || 0).toLocaleString()} EGP</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>{(p.netSalary || 0).toLocaleString()} EGP</div>
                    <Badge label={p.status} bg={s.bg} color={s.text} border={s.border} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payslip detail */}
      {selectedPayslip && (
        <div style={{ flex: '1 1 360px' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payslip</div>
                <div style={{ fontWeight: 700, fontSize: 20 }}>{selectedPayslip.period}</div>
              </div>
              <button onClick={() => window.print()} className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}>🖨️ Print</button>
            </div>

            {/* Earnings */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-success)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Earnings</div>
              {[
                ['Base Salary', selectedPayslip.baseSalary],
                ['Transport Allowance', selectedPayslip.transportAllowance],
                ['Housing Allowance', selectedPayslip.housingAllowance],
                ['Meal Allowance', selectedPayslip.mealAllowance],
                ['Mobile Allowance', selectedPayslip.mobileAllowance],
                ['Fuel Allowance', selectedPayslip.fuelAllowance],
                ['Performance Bonus', selectedPayslip.performanceBonus],
                ['Overtime Pay', selectedPayslip.overtimeAmount],
              ].filter(([, v]) => v > 0).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span>{v.toLocaleString()} EGP</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border-color)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                <span>Gross Earnings</span>
                <span style={{ color: 'var(--accent-success)' }}>{(selectedPayslip.grossEarnings || 0).toLocaleString()} EGP</span>
              </div>
            </div>

            {/* Deductions */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-danger)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Deductions</div>
              {[
                ['Income Tax', selectedPayslip.incomeTax],
                ['Social Insurance (11%)', selectedPayslip.socialInsurance],
                ['Loan Deduction', selectedPayslip.loanDeduction],
                [`LWP (${selectedPayslip.leaveWithoutPayDays} days)`, selectedPayslip.leaveWithoutPay],
                ['Other', selectedPayslip.otherDeductions],
              ].filter(([, v]) => v > 0).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span style={{ color: 'var(--accent-danger)' }}>−{v.toLocaleString()} EGP</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border-color)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                <span>Total Deductions</span>
                <span style={{ color: 'var(--accent-danger)' }}>−{(selectedPayslip.totalDeductions || 0).toLocaleString()} EGP</span>
              </div>
            </div>

            {/* Net */}
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px 18px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Net Salary</div>
                <div style={{ fontWeight: 700, fontSize: 24, color: 'var(--text-primary)' }}>{(selectedPayslip.netSalary || 0).toLocaleString()} EGP</div>
              </div>
              <Badge label={selectedPayslip.status} bg={runStatusClr[selectedPayslip.status]?.bg} color={runStatusClr[selectedPayslip.status]?.text} border={runStatusClr[selectedPayslip.status]?.border} />
            </div>

            {selectedPayslip.hrNotes && (
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>📝 HR Note: {selectedPayslip.hrNotes}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────
  // RENDER — DISBURSEMENT QUEUE TAB
  // ─────────────────────────────────────────────────────────────

  const renderDisbursementQueue = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Failed Disbursements</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Employees whose payment could not be processed automatically</div>
        </div>
        <button onClick={fetchDisbursementQueue} className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}>↻ Refresh</button>
      </div>
      {dqLoading ? <div className="loading-state">Loading…</div>
      : dqList.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
          <div>No failed disbursements. All payments processed successfully.</div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Run</th>
                  <th>Net Amount</th>
                  <th>Failure Reason</th>
                  <th>Date</th>
                  {isSenior && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {dqList.map(e => (
                  <tr key={e._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{e.employeeId?.firstName} {e.employeeId?.lastName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.employeeId?.role}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{e.runId?.period}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.runId?.type}</div>
                    </td>
                    <td style={{ fontWeight: 700 }}>{(e.netSalary || 0).toLocaleString()} EGP</td>
                    <td>
                      <span style={{ fontSize: 12, color: '#B91C1C', background: 'rgba(239,68,68,0.08)', padding: '3px 8px', borderRadius: 6 }}>
                        ⚠️ {e.failureReason}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(e.updatedAt).toLocaleDateString()}</td>
                    {isSenior && (
                      <td>
                        <button
                          onClick={() => handleRetry(e._id)}
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: 11, padding: '4px 12px' }}
                        >
                          ✅ Mark Paid
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────
  // RENDER — PAYMENT METHODS TAB
  // ─────────────────────────────────────────────────────────────

  const renderPaymentMethods = () => (
    <div>
      {/* Reject Modal */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: 380, padding: 24 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Reject Card</h3>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              style={{ resize: 'vertical', marginBottom: 12 }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => { setRejectModal(null); setRejectReason(''); }}>Cancel</button>
              <button className="btn btn-primary" style={{ background: 'var(--accent-danger)', borderColor: 'var(--accent-danger)' }} onClick={handlePmReject}>Confirm Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {['Pending', 'Approved', 'Rejected', 'All'].map(f => (
          <button key={f} onClick={() => { setPmFilter(f); setTimeout(fetchPmList, 0); }} style={{
            background: pmFilter === f ? 'var(--accent-primary)' : 'var(--bg-card)',
            border: `1px solid ${pmFilter === f ? 'var(--accent-primary)' : 'var(--border-color)'}`,
            borderRadius: 12, padding: '5px 14px', fontSize: 12,
            color: pmFilter === f ? '#fff' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit',
          }}>{f}</button>
        ))}
        <button onClick={fetchPmList} className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}>↻ Refresh</button>
      </div>

      {pmLoading ? <div className="loading-state">Loading…</div>
      : pmList.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
          No {pmFilter !== 'All' ? pmFilter.toLowerCase() : ''} payment methods found.
        </div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Card</th>
                  <th>Length</th>
                  <th>Expiry</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pmList.map(pm => {
                  const sc = { Pending: { color: '#B45309', bg: 'rgba(245,158,11,0.12)' }, Approved: { color: '#047857', bg: 'rgba(16,185,129,0.12)' }, Rejected: { color: '#B91C1C', bg: 'rgba(239,68,68,0.12)' } }[pm.status] || {};
                  // Flag unusual card lengths for the reviewer
                  const len = pm.cardLength || 0;
                  const lenWarning = len < 13 ? 'Too short (< 13 digits)' : len > 19 ? 'Too long (> 19 digits)' : len === 14 ? 'Diners Club (14 digits)' : len === 15 ? 'Amex (15 digits)' : len === 16 ? 'Standard (16 digits)' : len === 13 ? 'Visa 13-digit' : `${len} digits`;
                  const lenColor = len < 13 || len > 19 ? '#B91C1C' : len === 16 ? '#047857' : '#B45309';
                  return (
                    <tr key={pm._id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{pm.employeeId?.firstName} {pm.employeeId?.lastName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pm.employeeId?.role}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, fontFamily: 'monospace', letterSpacing: 1 }}>{pm.cardToken}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pm.cardholderName} · {pm.cardType}</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: lenColor }}>{len} digits</span>
                        <div style={{ fontSize: 11, color: lenColor }}>{lenWarning}</div>
                      </td>
                      <td>{pm.expiryMonth}/{pm.expiryYear}</td>
                      <td>
                        <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color }}>{pm.status}</span>
                        {pm.status === 'Rejected' && pm.rejectionReason && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{pm.rejectionReason}</div>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(pm.createdAt).toLocaleDateString()}</td>
                      <td>
                        {pm.status === 'Pending' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => handlePmApprove(pm._id)} className="btn btn-primary btn-sm" style={{ fontSize: 11, padding: '4px 10px' }}>Approve</button>
                            <button onClick={() => setRejectModal(pm._id)} className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: '4px 10px', color: 'var(--accent-danger)' }}>Reject</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────
  // RENDER — PAYROLL RUNS TAB
  // ─────────────────────────────────────────────────────────────

  const renderPayrollRuns = () => (
    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div style={{ flex: '1 1 500px' }}>
        {/* Generate Panel */}
        <div className="card" style={{ marginBottom: 16, border: '1px solid rgba(37,99,235,0.25)' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Generate New Payroll Run</h3>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Period</div>
              <input
                type="month"
                value={runPeriod}
                onChange={e => setRunPeriod(e.target.value)}
                className="form-input"
                style={{ width: 160, padding: '8px 12px' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Run Type</div>
              <select className="form-input" value={runType} onChange={e => setRunType(e.target.value)} style={{ padding: '8px 12px' }}>
                <option value="Salary">💰 Salary</option>
                <option value="Bonus">🎁 Bonus</option>
              </select>
            </div>
            {runType === 'Bonus' && (
              <>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Bonus Amount (per employee)</div>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    value={bonusAmount}
                    onChange={e => setBonusAmount(e.target.value)}
                    placeholder="e.g. 2000"
                    style={{ width: 160, padding: '8px 12px' }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Note (optional)</div>
                  <input
                    className="form-input"
                    value={bonusNote}
                    onChange={e => setBonusNote(e.target.value)}
                    placeholder="e.g. Ramadan Bonus"
                    style={{ width: 180, padding: '8px 12px' }}
                  />
                </div>
              </>
            )}
            <button
              onClick={handleGenerateRun}
              className="btn btn-primary"
              disabled={generatingRun}
            >
              {generatingRun ? 'Generating…' : `Generate ${runType} Run`}
            </button>
          </div>
          {runType === 'Salary' && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
              ⚠️ Only one salary run is allowed per period. Bonus runs can be created anytime.
            </div>
          )}
          {runMsg.text && (
            <div className={`alert alert-${runMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginTop: 10, padding: '8px 12px', fontSize: 12 }}>
              {runMsg.text}
            </div>
          )}
        </div>

        {/* Runs Table */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>Payroll Runs History</h3>
            <button onClick={fetchRuns} className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}>↻ Refresh</button>
          </div>
          {runsLoading ? <div className="loading-state">Loading runs…</div>
          : runs.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>No payroll runs found. Generate your first run above.</div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Headcount</th>
                    <th>Total Net</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map(r => {
                    const s = runStatusClr[r.status] || runStatusClr.Draft;
                    const isBonus = r.type === 'Bonus';
                    return (
                      <tr key={r._id} style={{ cursor: 'pointer', background: selectedRun?._id === r._id ? 'rgba(37,99,235,0.06)' : '' }}
                        onClick={() => { setSelectedRun(r); fetchRunEntries(r._id); }}>
                        <td style={{ fontWeight: 600 }}>{r.period}</td>
                        <td>
                          <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: isBonus ? 'rgba(245,158,11,0.12)' : 'rgba(37,99,235,0.10)', color: isBonus ? '#B45309' : '#2563EB' }}>
                            {isBonus ? '🎁 Bonus' : '💰 Salary'}
                          </span>
                        </td>
                        <td><Badge label={r.status} bg={s.bg} color={s.text} border={s.border} /></td>
                        <td>{r.headcount || 0} emp</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{(r.totalNet || 0).toLocaleString()} EGP</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {r.status === 'Draft' && (
                              <button onClick={(e) => { e.stopPropagation(); handleApproveRun(r._id); }} className="btn btn-primary btn-sm" style={{ fontSize: 11, padding: '4px 10px' }}>Approve</button>
                            )}
                            {r.status === 'Approved' && (
                              <button onClick={(e) => { e.stopPropagation(); handleReleaseRun(r._id, false); }} className="btn btn-primary btn-sm" style={{ fontSize: 11, padding: '4px 10px' }}>
                                {isSenior ? 'Release' : 'Request Release'}
                              </button>
                            )}
                            {r.status === 'PendingRelease' && isSenior && (
                              <button onClick={(e) => { e.stopPropagation(); handleReleaseRun(r._id, true); }} className="btn btn-primary btn-sm" style={{ fontSize: 11, padding: '4px 10px', background: 'var(--accent-success)', borderColor: 'var(--accent-success)' }}>Confirm Release</button>
                            )}
                            {r.status === 'PendingRelease' && !isSenior && (
                              <span style={{ fontSize: 11, color: '#92400E' }}>⏳ Awaiting manager</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Run Entries Side Panel */}
      {selectedRun && (
        <div style={{ flex: '1 1 340px' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Payroll Run Details</div>
                <div style={{ fontWeight: 700, fontSize: 17 }}>{selectedRun.period}</div>
              </div>
              <Badge label={selectedRun.status} bg={runStatusClr[selectedRun.status]?.bg} color={runStatusClr[selectedRun.status]?.text} border={runStatusClr[selectedRun.status]?.border} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[
                { l: 'Headcount', v: selectedRun.headcount || 0 },
                { l: 'Gross Total', v: (selectedRun.totalGross || 0).toLocaleString() + ' EGP' },
                { l: 'Net Total', v: (selectedRun.totalNet || 0).toLocaleString() + ' EGP' },
                { l: 'Total Tax', v: (selectedRun.totalTax || 0).toLocaleString() + ' EGP' },
              ].map(({ l, v, color }) => (
                <div key={l} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l}</div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: color || 'var(--text-primary)' }}>{v}</div>
                </div>
              ))}
            </div>
            <h4 style={{ margin: '0 0 10px', fontSize: 13 }}>Employee Entries ({runEntries.length})</h4>
            {runEntriesLoading ? <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Loading entries…</div>
            : (
              <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {runEntries.map(e => (
                  <div key={e._id} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{e.employeeId?.firstName} {e.employeeId?.lastName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.employeeId?.role}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{(e.netSalary || 0).toLocaleString()} EGP</div>
                      <Badge label={e.status} bg={runStatusClr[e.status]?.bg || 'rgba(148,163,184,0.15)'} color={runStatusClr[e.status]?.text || '#64748B'} border={runStatusClr[e.status]?.border || '#94A3B833'} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────
  // RENDER — ALERTS & FRAUD TAB
  // ─────────────────────────────────────────────────────────────

  const renderAlerts = () => {
    const filtered = alerts.filter(a => {
      const typeMatch = alertFilter === 'All' || a.type === alertFilter;
      const sevMatch  = alertSeverityFilter === 'All' || a.severity === alertSeverityFilter;
      return typeMatch && sevMatch;
    });

    const openCount     = alerts.filter(a => a.status === 'Open').length;
    const criticalCount = alerts.filter(a => a.severity === 'Critical').length;
    const fraudCount    = alerts.filter(a => a.type === 'Fraud').length;

    return (
      <div>
        {/* Stats Row */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          {[
            { icon: '🔴', label: 'Open Alerts', value: openCount },
            { icon: '🚨', label: 'Critical', value: criticalCount },
            { icon: '👻', label: 'Fraud Flags', value: fraudCount },
            { icon: '✅', label: 'Resolved', value: alerts.filter(a => a.status === 'Resolved').length },
          ].map(({ icon, label, value }) => (
            <MetricCard key={label} icon={icon} label={label} value={value} />
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {['All', 'Fraud', 'Anomaly', 'Compliance', 'Recommendation', 'Info'].map(f => (
              <button key={f} onClick={() => setAlertFilter(f)} style={{
                background: alertFilter === f ? 'var(--accent-primary)' : 'var(--bg-card)',
                border: `1px solid ${alertFilter === f ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                borderRadius: 12, padding: '5px 12px', fontSize: 12, color: alertFilter === f ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>{f}</button>
            ))}
          </div>
          <select value={alertSeverityFilter} onChange={e => setAlertSeverityFilter(e.target.value)} className="form-input" style={{ width: 130, fontSize: 12, padding: '6px 10px' }}>
            <option value="All">All Severities</option>
            {['Critical', 'High', 'Medium', 'Low'].map(s => <option key={s}>{s}</option>)}
          </select>
          <button onClick={fetchAlerts} className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}>↻ Refresh</button>
        </div>

        {/* Alert Cards */}
        {alertsLoading ? <div className="loading-state">Loading alerts…</div>
        : filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div>No alerts matching the current filter.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(a => {
              const s = sev[a.severity] || sev.Low;
              const t = alertTypeClr[a.type] || alertTypeClr.Info;
              return (
                <div key={a._id} style={{
                  background: a.status !== 'Open' ? 'var(--bg-card)' : 'var(--bg-card)',
                  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px 18px',
                  opacity: a.status !== 'Open' ? 0.65 : 1,
                  borderLeft: `3px solid ${s.dot}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 20, flexShrink: 0 }}>{t.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{a.title}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>{a.message}</div>
                        {a.employeeId && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                            👤 {a.employeeId.firstName} {a.employeeId.lastName} · {a.employeeId.role}
                          </div>
                        )}
                        {a.suggestedAction && (
                          <div style={{ fontSize: 12, marginTop: 5, padding: '4px 8px', background: 'rgba(37,99,235,0.08)', borderRadius: 6, display: 'inline-block', color: 'var(--accent-primary)' }}>
                            💡 {a.suggestedAction}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <Badge label={a.severity} bg={s.bg} color={s.text} border={s.border} />
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Confidence: {a.confidenceScore}%</div>
                      <div style={{ width: 80, height: 4, background: 'var(--bg-secondary)', borderRadius: 2 }}>
                        <div style={{ width: `${a.confidenceScore}%`, height: '100%', background: s.dot, borderRadius: 2 }} />
                      </div>
                      {a.status === 'Open' && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                          <button onClick={() => handleAlertStatus(a._id, 'Acknowledged')} className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: '4px 10px' }}>Acknowledge</button>
                          <button onClick={() => handleAlertStatus(a._id, 'Resolved')} className="btn btn-primary btn-sm" style={{ fontSize: 11, padding: '4px 10px' }}>Resolve</button>
                        </div>
                      )}
                      {a.status !== 'Open' && <Badge label={a.status} bg="var(--bg-secondary)" color="var(--text-muted)" border="var(--border-color)" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER — ANALYTICS TAB
  // ─────────────────────────────────────────────────────────────

  const renderAnalytics = () => {
    if (analyticsLoading) return <div className="loading-state">Loading analytics…</div>;
    if (!analytics) return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>No analytics data available yet.</div>;

    const deptEntries = Object.entries(analytics.deptBreakdown || {}).sort((a, b) => b[1].totalSalary - a[1].totalSalary);
    const maxDeptSalary = deptEntries[0]?.[1]?.totalSalary || 1;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* KPI Metrics */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <MetricCard icon="👥" label="Total Headcount" value={analytics.headcount} />
          <MetricCard icon="💰" label="Monthly Payroll" value={(analytics.totalPayroll || 0).toLocaleString() + ' EGP'} />
          <MetricCard icon="📊" label="Avg Salary" value={(analytics.avgSalary || 0).toLocaleString() + ' EGP'} />
          <MetricCard icon="🚨" label="Open Alerts" value={analytics.openAlertsCount} sub={analytics.criticalAlertsCount + ' critical'} />
        </div>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Department Breakdown */}
          <div className="card" style={{ flex: '2 1 380px' }}>
            <h3 style={{ margin: '0 0 18px', fontSize: 14 }}>Department Payroll Breakdown</h3>
            {deptEntries.length === 0 ? <div style={{ color: 'var(--text-muted)' }}>No data.</div>
            : deptEntries.map(([dept, d]) => (
              <div key={dept} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{dept}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{d.count} emp · {(d.totalSalary || 0).toLocaleString()} EGP</span>
                </div>
                <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(d.totalSalary / maxDeptSalary) * 100}%`, height: '100%',
                    background: 'var(--accent-primary)', borderRadius: 4, transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>

          {/* Right Column */}
          <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Top Earners */}
            <div className="card">
              <h3 style={{ margin: '0 0 14px', fontSize: 14 }}>🏆 Top Earners</h3>
              {(analytics.topEarners || []).map((e, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', background: i === 0 ? 'var(--accent-warning)' : i === 1 ? 'var(--bg-secondary)' : 'var(--bg-secondary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: i === 0 ? '#fff' : 'var(--text-secondary)',
                    }}>{i + 1}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{e.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.role}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: 13 }}>{(e.netSalary || 0).toLocaleString()} EGP</div>
                </div>
              ))}
            </div>

            {/* Monthly Trend */}
            <div className="card">
              <h3 style={{ margin: '0 0 14px', fontSize: 14 }}>📈 Monthly Trend</h3>
              {(analytics.monthlyTrend || []).map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{m.period}</span>
                  <span style={{ fontWeight: 600 }}>{(m.totalNet || 0).toLocaleString()} EGP</span>
                </div>
              ))}
              {!(analytics.monthlyTrend?.length) && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No released runs yet.</div>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER — COMPANY SOURCE BANK ACCOUNTS
  // ─────────────────────────────────────────────────────────────

  const renderCompanyAccounts = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Company Source Bank Accounts</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>The real accounts payroll money is debited from. Stored encrypted — only masked values are shown.</div>
        </div>
        <button onClick={() => setCaForm({ open: !caForm.open, editing: null, nickname: '', bankName: '', branchName: '', accountName: '', accountNumber: '', iban: '', swiftCode: '', disbursementProvider: 'Fawry', monthlyLimit: '', isDefault: false, notes: '' })} className="btn btn-primary btn-sm" style={{ fontSize: 11 }}>
          {caForm.open ? '✕ Close' : '➕ Add Account'}
        </button>
      </div>

      {caMsg.text && (
        <div className={`alert alert-${caMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 12, padding: '8px 12px', fontSize: 12 }}>{caMsg.text}</div>
      )}

      {caForm.open && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 13 }}>{caForm.editing ? 'Edit' : 'New'} Company Account</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Nickname *"><input className="form-input" value={caForm.nickname} onChange={e => setCaForm({ ...caForm, nickname: e.target.value })} placeholder="e.g. Main Operating" /></Field>
            <Field label="Bank Name *"><input className="form-input" value={caForm.bankName} onChange={e => setCaForm({ ...caForm, bankName: e.target.value })} placeholder="e.g. NBE / CIB / QNB" /></Field>
            <Field label="Branch Name"><input className="form-input" value={caForm.branchName} onChange={e => setCaForm({ ...caForm, branchName: e.target.value })} /></Field>
            <Field label="Account Holder *"><input className="form-input" value={caForm.accountName} onChange={e => setCaForm({ ...caForm, accountName: e.target.value })} /></Field>
            <Field label="Account Number"><input className="form-input" value={caForm.accountNumber} onChange={e => setCaForm({ ...caForm, accountNumber: e.target.value })} /></Field>
            <Field label="IBAN"><input className="form-input" value={caForm.iban} onChange={e => setCaForm({ ...caForm, iban: e.target.value })} /></Field>
            <Field label="SWIFT / Bank Code"><input className="form-input" value={caForm.swiftCode} onChange={e => setCaForm({ ...caForm, swiftCode: e.target.value })} /></Field>
            <Field label="Provider">
              <select className="form-input" value={caForm.disbursementProvider} onChange={e => setCaForm({ ...caForm, disbursementProvider: e.target.value })}>
                <option value="Fawry">Fawry</option>
                <option value="PayMob">PayMob</option>
                <option value="InstaPay">InstaPay (IPN)</option>
                <option value="BankAPI">Bank API</option>
              </select>
            </Field>
            <Field label="Monthly Limit (EGP)"><input className="form-input" type="number" value={caForm.monthlyLimit} onChange={e => setCaForm({ ...caForm, monthlyLimit: e.target.value })} placeholder="0 = unlimited" /></Field>
            <Field label="Default">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={caForm.isDefault} onChange={e => setCaForm({ ...caForm, isDefault: e.target.checked })} /> Set as default source
              </label>
            </Field>
          </div>
          <div style={{ marginTop: 12 }}>
            <Field label="Notes"><textarea className="form-input" rows={2} value={caForm.notes} onChange={e => setCaForm({ ...caForm, notes: e.target.value })} /></Field>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => { setCaForm({ ...caForm, open: false }); setCaMsg({ type: '', text: '' }); }}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleCaSave}>💾 Save Account</button>
          </div>
        </div>
      )}

      {caLoading ? <div className="loading-state">Loading…</div>
      : companyAccounts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No company accounts configured yet.</div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Nickname</th><th>Bank</th><th>Account (masked)</th><th>Provider</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {companyAccounts.map(a => (
                  <tr key={a._id}>
                    <td style={{ fontWeight: 600 }}>{a.nickname} {a.isDefault && <span style={{ fontSize: 10, background: 'rgba(37,99,235,0.12)', color: '#2563EB', padding: '2px 6px', borderRadius: 6, marginLeft: 4 }}>DEFAULT</span>}</td>
                    <td>{a.bankName}</td>
                    <td style={{ fontFamily: 'monospace' }}>{a.accountMasked || a.ibanMasked || '—'}</td>
                    <td>{a.disbursementProvider}</td>
                    <td>
                      {a.verifiedAt
                        ? <span style={{ color: '#047857', fontSize: 12 }}>✓ Verified</span>
                        : <span style={{ color: '#B45309', fontSize: 12 }}>Unverified</span>}
                      {!a.isActive && <span style={{ color: '#B91C1C', fontSize: 12, marginLeft: 6 }}>· Inactive</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {!a.verifiedAt && <button className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => handleCaVerify(a._id)}>Verify</button>}
                        <button className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: '4px 10px', color: 'var(--accent-danger)' }} onClick={() => handleCaDelete(a._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const Field = ({ label, children }) => (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );

  // ─────────────────────────────────────────────────────────────
  // RENDER — EMPLOYEE BANK ACCOUNTS (vendor-aware)
  // ─────────────────────────────────────────────────────────────

  const renderBankAccounts = () => {
    const cap = vendorOf(baForm.vendor);
    const fieldRules = (cap.fields && cap.fields[baForm.method]) || {};

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Employee Bank Accounts</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Each employee is paid via a vendor (Fawry / PayMob / InstaPay / …). Required fields adapt to the selected vendor.</div>
          </div>
          <button onClick={() => handleBaOpen(null)} className="btn btn-primary btn-sm" style={{ fontSize: 11 }}>➕ Add Bank Account</button>
        </div>

        {baMsg.text && (
          <div className={`alert alert-${baMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 12, padding: '8px 12px', fontSize: 12 }}>{baMsg.text}</div>
        )}

        {/* Add / Edit modal */}
        {baForm.open && (
          <div className="card" style={{ marginBottom: 16 }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 13 }}>{baForm.editing ? 'Edit' : 'New'} Employee Bank Account</h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Employee ID">
                <input className="form-input" value={baForm.employeeId} onChange={e => setBaForm({ ...baForm, employeeId: e.target.value })} placeholder="User _id (leave blank for self)" />
              </Field>
              <Field label="Payment Vendor (Gateway)">
                <select className="form-input" value={baForm.vendor} onChange={e => setBaForm({ ...baForm, vendor: e.target.value, method: vendorOf(e.target.value).methods[0] })}>
                  {vendors.map(v => <option key={v.key} value={v.key}>{v.label}{v.configured ? ' ✓' : ' (not configured)'}</option>)}
                </select>
              </Field>
            </div>

            <div style={{ marginTop: 12, maxWidth: 280 }}>
              <Field label="Disbursement Method">
                <select className="form-input" value={baForm.method} onChange={e => setBaForm({ ...baForm, method: e.target.value })}>
                  {cap.methods.map(m => <option key={m} value={m}>{m === 'BankAccount' ? '🏦 Bank Account' : m === 'FawryWallet' ? '📱 Fawry Wallet' : m === 'PayMobWallet' ? '💳 PayMob Wallet' : m}</option>)}
                </select>
              </Field>
            </div>

            {/* Vendor-specific required fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              {Object.entries(fieldRules).map(([field, rule]) => {
                const labelMap = {
                  accountName: 'Account Holder Name', bankName: 'Bank Name', accountNumber: 'Account Number',
                  iban: 'IBAN', swiftCode: 'SWIFT / Bank Code', branchCode: 'Branch Code',
                  fawryMobile: 'Fawry Mobile Number', paymobWallet: 'PayMob Wallet Number',
                };
                const reqLabel = rule.required ? ' *' : (rule.eitherOf ? ` (or ${rule.eitherOf})` : '');
                return (
                  <Field key={field} label={(labelMap[field] || field) + reqLabel}>
                    <input className="form-input" value={baForm[field] || ''} onChange={e => setBaForm({ ...baForm, [field]: e.target.value })} placeholder={labelMap[field] || field} />
                  </Field>
                );
              })}
            </div>

            {baErrors.length > 0 && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: 10, marginTop: 12 }}>
                {baErrors.map((err, i) => <div key={i} style={{ fontSize: 12, color: '#B91C1C' }}>⚠️ {err}</div>)}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setBaForm({ ...baForm, open: false })}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleBaSave}>💾 Save Bank Account</button>
            </div>
          </div>
        )}

        {baLoading ? <div className="loading-state">Loading…</div>
        : bankAccounts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No employee bank accounts yet.</div>
        ) : (
          <div className="card">
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Employee</th><th>Vendor</th><th>Method</th><th>Bank</th><th>Account (masked)</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {bankAccounts.map(a => (
                    <tr key={a._id}>
                      <td style={{ fontWeight: 600 }}>{a.employeeId?.firstName} {a.employeeId?.lastName}</td>
                      <td>{a.preferredGateway}</td>
                      <td>{a.disbursementMethod}</td>
                      <td>{a.bankName}</td>
                      <td style={{ fontFamily: 'monospace' }}>{a.accountNumber || a.iban || '—'}</td>
                      <td>
                        {a.isVerified
                          ? <span style={{ color: '#047857', fontSize: 12 }}>✓ Verified</span>
                          : <span style={{ color: '#B45309', fontSize: 12 }}>Unverified</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => handleBaOpen(a)}>Edit</button>
                          {!a.isVerified && <button className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => handleBaVerify(a._id)}>Verify</button>}
                          <button className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: '4px 10px', color: 'var(--accent-danger)' }} onClick={() => handleBaDelete(a._id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Payroll Department</h1>
          <p className="page-subtitle">
            Process monthly salaries, manage runs and deductions, and review fraud flags & payroll analytics
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {isMgr && (
            <div style={{
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 12, padding: '5px 14px', fontSize: 12, color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-success)', display: 'inline-block' }} />
              Manager Access
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 0, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === t.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
              borderRadius: 0,
              color: activeTab === t.id ? 'var(--accent-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: activeTab === t.id ? 600 : 400,
              transition: 'var(--transition)',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
              marginBottom: -1,
            }}
          >{t.label}</button>
        ))}
      </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'payslips'           && renderPayslips()}
          {activeTab === 'runs'               && isMgr && renderPayrollRuns()}
          {activeTab === 'disbursement-queue' && isMgr && renderDisbursementQueue()}
          {activeTab === 'payment-methods'    && isMgr && renderPaymentMethods()}
          {activeTab === 'company-accounts'   && isMgr && renderCompanyAccounts()}
          {activeTab === 'bank-accounts'      && isMgr && renderBankAccounts()}
          {activeTab === 'alerts'             && isMgr && renderAlerts()}
           {activeTab === 'analytics'          && isMgr && renderAnalytics()}
         </div>

      {/* ── Release Confirmation Modal ── */}
      {releaseModal.open && releaseModal.readiness && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: 480, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>{releaseModal.isPending ? 'Request Payroll Release' : 'Confirm Payroll Release'}</h3>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
              Period {releaseModal.readiness.period} · {releaseModal.readiness.headcount} employees · {(releaseModal.readiness.totalToDisburse || 0).toLocaleString()} EGP total
            </div>

            {/* Readiness summary */}
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Ready to pay</span><strong>{releaseModal.readiness.readyToPay}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Missing bank account</span><strong style={{ color: releaseModal.readiness.missingBank ? '#B91C1C' : 'inherit' }}>{releaseModal.readiness.missingBank}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Unverified</span><strong style={{ color: releaseModal.readiness.unverified ? '#B91C1C' : 'inherit' }}>{releaseModal.readiness.unverified}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Live mode (server)</span><strong style={{ color: releaseModal.readiness.liveModeEnabledGlobally ? '#047857' : '#B45309' }}>{releaseModal.readiness.liveModeEnabledGlobally ? 'ENABLED' : 'DISABLED'}</strong></div>
            </div>

            {releaseModal.readiness.issues?.length > 0 && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: 10, marginBottom: 14 }}>
                {releaseModal.readiness.issues.map((iss, i) => <div key={i} style={{ fontSize: 12, color: '#B91C1C' }}>⚠️ {iss}</div>)}
              </div>
            )}

            {/* Source account */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Source Company Bank Account</div>
              <select className="form-input" value={releaseModal.sourceAccountId} onChange={e => setReleaseModal({ ...releaseModal, sourceAccountId: e.target.value })}>
                <option value="">— Select source account —</option>
                {companyAccounts.map(a => <option key={a._id} value={a._id}>{a.nickname} ({a.bankName})</option>)}
              </select>
            </div>

            {/* Mode */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Disbursement Mode</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <label style={{ flex: 1, border: `1px solid ${releaseModal.mode === 'simulation' ? 'var(--accent-primary)' : 'var(--border-color)'}`, borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 12 }}>
                  <input type="radio" name="mode" checked={releaseModal.mode === 'simulation'} onChange={() => setReleaseModal({ ...releaseModal, mode: 'simulation' })} /> <strong>Simulation</strong><br />No real money moves
                </label>
                <label style={{ flex: 1, border: `1px solid ${releaseModal.mode === 'live' ? 'var(--accent-danger)' : 'var(--border-color)'}`, borderRadius: 8, padding: '8px 12px', cursor: releaseModal.readiness.liveModeEnabledGlobally ? 'pointer' : 'not-allowed', opacity: releaseModal.readiness.liveModeEnabledGlobally ? 1 : 0.5, fontSize: 12 }}>
                  <input type="radio" name="mode" disabled={!releaseModal.readiness.liveModeEnabledGlobally} checked={releaseModal.mode === 'live'} onChange={() => setReleaseModal({ ...releaseModal, mode: 'live' })} /> <strong>Live</strong><br />Real funds disbursed
                </label>
              </div>
              {releaseModal.mode === 'live' && !releaseModal.readiness.liveModeEnabledGlobally && (
                <div style={{ fontSize: 11, color: '#B91C1C', marginTop: 6 }}>Live mode is disabled on the server (DISBURSEMENT_LIVE_MODE=false). Set it in the environment to move real money.</div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setReleaseModal({ open: false, runId: null, isPending: false, readiness: null, sourceAccountId: '', mode: 'simulation', loading: false })}>Cancel</button>
              <button
                className="btn btn-primary"
                style={releaseModal.mode === 'live' ? { background: 'var(--accent-danger)', borderColor: 'var(--accent-danger)' } : {}}
                disabled={releaseModal.loading || !releaseModal.sourceAccountId}
                onClick={confirmRelease}
              >
                {releaseModal.loading ? 'Processing…' : (releaseModal.isPending ? 'Request Release' : (releaseModal.mode === 'live' ? '⚠ RELEASE — LIVE' : 'Release (Simulation)'))}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
   );
};

export default PayrollPage;
