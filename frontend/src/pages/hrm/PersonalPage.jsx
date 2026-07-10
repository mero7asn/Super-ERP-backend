import { useState, useEffect } from 'react';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DEPARTMENTS } from '../../services/departmentJobs';

// Color map for UI status tags
const STATUS_COLORS = {
  Approved: { bg: 'rgba(16,185,129,0.12)', text: '#6EE7B7', border: '#10B98133' },
  Rejected: { bg: 'rgba(239,68,68,0.12)', text: '#FCA5A5', border: '#EF444433' },
  Submitted: { bg: 'rgba(59,130,246,0.12)', text: '#93C5FD', border: '#3B82F633' },
  Pending: { bg: 'rgba(245,158,11,0.12)', text: '#FCD34D', border: '#F59E0B33' },
  'Pending Upload': { bg: 'rgba(156,163,175,0.08)', text: '#D1D5DB', border: '#9CA3AF22' },
};

const PersonalPage = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [contract, setContract] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // Current view tabs: 'profile' | 'contract' | 'docs' | 'leaves'
  const [activeSubTab, setActiveSubTab] = useState('profile');
  const [uploadingDoc, setUploadingDoc] = useState(''); // which docField is being uploaded

  // Gov Doc Templates (Super Admin managed)
  const [govDocTemplates, setGovDocTemplates] = useState([]);
  const [customGovDocs, setCustomGovDocs] = useState({});
  const [customGovDocsDetails, setCustomGovDocsDetails] = useState({});
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [newDocLabel, setNewDocLabel] = useState('');
  const [newDocLabelAr, setNewDocLabelAr] = useState('');
  const [newDocDesc, setNewDocDesc] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Form Fields for Contract
  const [baseSalary, setBaseSalary] = useState('');
  const [netSalary, setNetSalary] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [contractEndDate, setContractEndDate] = useState('');
  const [govDocs, setGovDocs] = useState({
    nationalId: '',
    socialInsurance: '',
    militaryStatus: '',
    graduationCertificate: '',
    criminalRecord: ''
  });
  const [requiredDocs, setRequiredDocs] = useState([]);
  const [govDocsDetails, setGovDocsDetails] = useState({});

  // Granular Schedule Configurator Fields
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // "YYYY-MM"
  const [detailedSchedule, setDetailedSchedule] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState('Week 1');
  const [weekShift, setWeekShift] = useState('Day Shift (09:00 - 17:00)');
  const [weekOffDays, setWeekOffDays] = useState(['Friday', 'Saturday']);
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyShift, setDailyShift] = useState('Day Shift (09:00 - 17:00)');
  const [dailyIsOff, setDailyIsOff] = useState(false);

  // Active day detail view for staggered timing configuration
  const [activeExpandedDay, setActiveExpandedDay] = useState(null);

  // Default AUX Target fields for monthly initial configuration
  const [defaultLiveTarget, setDefaultLiveTarget] = useState(480);
  const [defaultBreakTarget, setDefaultBreakTarget] = useState(60);
  const [defaultTrainingTarget, setDefaultTrainingTarget] = useState(0);
  const [defaultCoachingTarget, setDefaultCoachingTarget] = useState(0);

  // Leave Form Fields
  const [leaveType, setLeaveType] = useState('Annual');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  // Shift Fields (for scheduling)
  const [shift, setShift] = useState('Day Shift (09:00 - 17:00)');
  const [offDays, setOffDays] = useState(['Friday', 'Saturday']);

  const [deptFilter, setDeptFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');

  // Salary component form state
  const [compForm, setCompForm] = useState({ label: '', type: 'Earning', valueType: 'Fixed', value: '', kpiLinked: false, note: '', editId: null });
  const [savingComp, setSavingComp] = useState(false);

  // Leave balance
  const [leaveBalance, setLeaveBalance] = useState(null);

  const isHR = ['HRM System Administrator', 'HR Manager', 'HR Specialist (Generalist)', 'Super CRM Administrator', 'HR Director / Executive HR User'].includes(user?.role);
  const isSuperAdmin = ['Super CRM Administrator', 'HRM System Administrator'].includes(user?.role);

  // Dynamic role list based on selected department filter
  const availableRoles = (() => {
    if (deptFilter === 'All') return [];
    return DEPARTMENTS.find(d => d.id === deptFilter)?.roles || [];
  })();

  const filteredEmployees = employees.filter(e => {
    const deptMatch = deptFilter === 'All' || DEPARTMENTS.find(d => d.id === deptFilter)?.roles.includes(e.role);
    const roleMatch = roleFilter === 'All' || e.role === roleFilter;
    return deptMatch && roleMatch;
  });

  const fetchEmployees = async () => {
    try {
      const { data } = await API.get('/auth/users-list');
      setEmployees(data.data || []);
      if (!isHR) {
        setSelectedEmployeeId(user?._id);
      } else if (data.data && data.data.length > 0) {
        setSelectedEmployeeId(data.data[0]._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data } = await API.get('/hrm/gov-doc-templates');
      setGovDocTemplates(data.data || []);
    } catch (err) {
      console.error('Failed to fetch gov doc templates', err);
    }
  };

  const fetchContract = async () => {
    if (!selectedEmployeeId) return;
    setLoading(true);
    try {
      let res;
      if (selectedEmployeeId === user?._id) {
        res = await API.get('/hrm/contracts/my');
      } else {
        const { data } = await API.get('/hrm/contracts');
        const match = (data.data || []).find(c => c.employeeId?._id === selectedEmployeeId || c.employeeId === selectedEmployeeId);
        res = { data: { data: match } };
      }

      if (res.data && res.data.data) {
        const c = res.data.data;
        setContract(c);
        setBaseSalary(c.baseSalary || '');
        setNetSalary(c.netSalary || '');
        setHireDate(c.hireDate ? new Date(c.hireDate).toISOString().split('T')[0] : '');
        setContractEndDate(c.contractEndDate ? new Date(c.contractEndDate).toISOString().split('T')[0] : '');
        setGovDocs({
          nationalId: c.govDocs?.nationalId || '',
          socialInsurance: c.govDocs?.socialInsurance || '',
          militaryStatus: c.govDocs?.militaryStatus || '',
          graduationCertificate: c.govDocs?.graduationCertificate || '',
          criminalRecord: c.govDocs?.criminalRecord || ''
        });
        setRequiredDocs(c.requiredDocsToUpload || []);
        setGovDocsDetails(c.govDocsDetails || {});
        setCustomGovDocs(c.customGovDocs || {});
        setCustomGovDocsDetails(c.customGovDocsDetails || {});
      } else {
        setContract(null);
        setBaseSalary('');
        setNetSalary('');
        setHireDate('');
        setContractEndDate('');
        setGovDocs({
          nationalId: '',
          socialInsurance: '',
          militaryStatus: '',
          graduationCertificate: '',
          criminalRecord: ''
        });
        setGovDocsDetails({});
        setCustomGovDocs({});
        setCustomGovDocsDetails({});
      }
    } catch (err) {
      console.error(err);
      setContract(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaves = async () => {
    try {
      const { data } = await API.get('/hrm/leaves');
      setLeaves(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLeaveBalance = async (empId) => {
    try {
      const id = empId || selectedEmployeeId;
      const url = id && id !== user?._id ? `/hrm/leaves/balance/${id}` : '/hrm/leaves/balance';
      const { data } = await API.get(url);
      setLeaveBalance(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchLeaves();
    fetchLeaveBalance();
    fetchTemplates();
  }, []);

  const fetchDetailedSchedule = async () => {
    if (!selectedEmployeeId || !selectedMonth) return;
    try {
      const { data } = await API.get(`/hrm/schedules/detailed?employeeId=${selectedEmployeeId}&month=${selectedMonth}`);
      if (data.success && data.data) {
        const sched = data.data;
        setDetailedSchedule(sched);
        setShift(sched.defaultShift || 'Day Shift (09:00 - 17:00)');
        setOffDays(sched.defaultOffDays || ['Friday', 'Saturday']);
        
        // Bind AUX targets
        setDefaultLiveTarget(sched.defaultLiveTarget ?? 480);
        setDefaultBreakTarget(sched.defaultBreakTarget ?? 60);
        setDefaultTrainingTarget(sched.defaultTrainingTarget ?? 0);
        setDefaultCoachingTarget(sched.defaultCoachingTarget ?? 0);

        // Initialize weekly form controls with selected week's override if exists
        const weekData = (sched.weeklyOverrides || {})[selectedWeek] || { shift: sched.defaultShift, weeklyOffDays: sched.defaultOffDays };
        setWeekShift(weekData.shift || sched.defaultShift);
        setWeekOffDays(weekData.weeklyOffDays || sched.defaultOffDays);

        // Initialize daily form controls with selected date's override if exists
        const dayData = (sched.dailyOverrides || {})[selectedDate] || { shift: sched.defaultShift, isOffDay: false };
        setDailyShift(dayData.shift || sched.defaultShift);
        setDailyIsOff(dayData.isOffDay || false);
      }
    } catch (err) {
      console.error('Failed to load detailed schedule', err);
    }
  };

  useEffect(() => {
    if (selectedEmployeeId) {
      fetchContract();
      fetchDetailedSchedule();
      fetchLeaveBalance(selectedEmployeeId);
      const emp = employees.find(e => e._id === selectedEmployeeId);
      if (emp) {
        // Fallbacks
      }
    }
  }, [selectedEmployeeId, selectedMonth, employees]);

  useEffect(() => {
    if (detailedSchedule) {
      const weekData = (detailedSchedule.weeklyOverrides || {})[selectedWeek] || { 
        shift: detailedSchedule.defaultShift, 
        weeklyOffDays: detailedSchedule.defaultOffDays 
      };
      setWeekShift(weekData.shift || detailedSchedule.defaultShift);
      setWeekOffDays(weekData.weeklyOffDays || detailedSchedule.defaultOffDays);
    }
  }, [selectedWeek, detailedSchedule]);

  useEffect(() => {
    if (detailedSchedule) {
      const dayData = (detailedSchedule.dailyOverrides || {})[selectedDate] || { 
        shift: detailedSchedule.defaultShift, 
        isOffDay: false 
      };
      setDailyShift(dayData.shift || detailedSchedule.defaultShift);
      setDailyIsOff(dayData.isOffDay || false);
    }
  }, [selectedDate, detailedSchedule]);

  const handleSaveContract = async (e) => {
    e.preventDefault();
    if (!baseSalary || !netSalary || !hireDate) {
      setStatusMsg({ type: 'error', text: 'Base Salary, Net Salary, and Hire Date are required.' });
      return;
    }
    setSaving(true);
    setStatusMsg({ type: '', text: '' });
    try {
      await API.post('/hrm/contracts', {
        employeeId: selectedEmployeeId,
        baseSalary: Number(baseSalary),
        netSalary: Number(netSalary),
        hireDate,
        contractEndDate: contractEndDate || undefined,
        govDocs,
        requiredDocsToUpload: requiredDocs
      });
      setStatusMsg({ type: 'success', text: 'Contract saved successfully.' });
      fetchContract();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save contract.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDocUpload = async (docField, statusText) => {
    setSaving(true);
    setStatusMsg({ type: '', text: '' });
    try {
      const updatedDocs = { ...govDocs, [docField]: statusText };
      await API.post('/hrm/contracts/gov-docs', {
        employeeId: selectedEmployeeId,
        govDocs: updatedDocs
      });
      setStatusMsg({ type: 'success', text: 'Document submitted for verification.' });
      setGovDocs(updatedDocs);
      fetchContract();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Failed to submit document.' });
    } finally {
      setSaving(false);
    }
  };

  const handleGovDocFileUpload = async (docField, file) => {
    if (!file) return;
    setUploadingDoc(docField);
    setStatusMsg({ type: '', text: '' });
    try {
      const formData = new FormData();
      formData.append('docFile', file);
      formData.append('docField', docField);
      if (selectedEmployeeId) formData.append('employeeId', selectedEmployeeId);
      const { data } = await API.post('/hrm/contracts/gov-docs/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setStatusMsg({ type: 'success', text: 'Document uploaded – pending HR verification.' });
      if (data.fileUrl) {
        setGovDocs(prev => ({ ...prev, [docField]: data.fileUrl }));
      }
      fetchContract();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Upload failed.' });
    } finally {
      setUploadingDoc('');
    }
  };

 const handleVerifyDoc = async (docField, verifyStatus, remarks) => {
    setSaving(true);
    setStatusMsg({ type: '', text: '' });
    try {
      const empId = selectedEmployeeId;
      await API.put(`/hrm/contracts/gov-docs/${empId}/verify`, {
        docField,
        status: verifyStatus,
        remarks
      });
      setStatusMsg({ type: 'success', text: `Document ${verifyStatus} successfully.` });
      fetchContract();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Failed to verify doc.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveShift = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.put('/hrm/schedules/detailed', {
        employeeId: selectedEmployeeId,
        month: selectedMonth,
        defaultShift: shift,
        defaultOffDays: offDays,
        defaultLiveTarget: Number(defaultLiveTarget),
        defaultBreakTarget: Number(defaultBreakTarget),
        defaultTrainingTarget: Number(defaultTrainingTarget),
        defaultCoachingTarget: Number(defaultCoachingTarget)
      });
      setStatusMsg({ type: 'success', text: 'Monthly base schedule and AUX targets updated successfully.' });
      fetchDetailedSchedule();
      fetchEmployees();
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Failed to update schedule.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWeeklyOverride = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updatedOverrides = { 
        ...(detailedSchedule?.weeklyOverrides || {}),
        [selectedWeek]: {
          shift: weekShift,
          weeklyOffDays: weekOffDays
        }
      };
      await API.put('/hrm/schedules/detailed', {
        employeeId: selectedEmployeeId,
        month: selectedMonth,
        weeklyOverrides: updatedOverrides
      });
      setStatusMsg({ type: 'success', text: `Weekly override for ${selectedWeek} saved successfully.` });
      fetchDetailedSchedule();
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Failed to update weekly override.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDailyOverride = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updatedOverrides = {
        ...(detailedSchedule?.dailyOverrides || {}),
        [selectedDate]: {
          shift: dailyShift,
          isOffDay: dailyIsOff
        }
      };
      await API.put('/hrm/schedules/detailed', {
        employeeId: selectedEmployeeId,
        month: selectedMonth,
        dailyOverrides: updatedOverrides
      });
      setStatusMsg({ type: 'success', text: `Daily override for ${selectedDate} saved successfully.` });
      fetchDetailedSchedule();
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Failed to update daily override.' });
    } finally {
      setSaving(false);
    }
  };

  const handleRequestLeave = async (e) => {
    e.preventDefault();
    if (!leaveStart || !leaveEnd || !leaveReason) return;
    setSaving(true);
    try {
      await API.post('/hrm/leaves', {
        leaveType,
        startDate: leaveStart,
        endDate: leaveEnd,
        reason: leaveReason
      });
      setStatusMsg({ type: 'success', text: 'Leave request submitted.' });
      setLeaveStart('');
      setLeaveEnd('');
      setLeaveReason('');
      fetchLeaves();
      fetchLeaveBalance(selectedEmployeeId);
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Failed to request leave.' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateLeaveStatus = async (leaveId, newStatus) => {
    try {
      await API.put(`/hrm/leaves/${leaveId}/status`, { status: newStatus });
      setStatusMsg({ type: 'success', text: `Leave request ${newStatus}.` });
      fetchLeaves();
      fetchLeaveBalance(selectedEmployeeId);
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Failed to update leave status.' });
    }
  };

  const saveComponent = async () => {
    if (!compForm.label || !compForm.value) return;
    setSavingComp(true);
    try {
      const { data } = await API.post('/hrm/contracts/salary-components', {
        employeeId: selectedEmployeeId,
        componentId: compForm.editId || undefined,
        label: compForm.label, type: compForm.type, valueType: compForm.valueType,
        value: compForm.value, kpiLinked: compForm.kpiLinked, note: compForm.note,
      });
      setContract(prev => ({ ...prev, salaryComponents: data.data }));
      setCompForm({ label: '', type: 'Earning', valueType: 'Fixed', value: '', kpiLinked: false, note: '', editId: null });
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save component.' });
    } finally { setSavingComp(false); }
  };

  const deleteComponent = async (id) => {
    try {
      const { data } = await API.delete(`/hrm/contracts/salary-components/${id}?employeeId=${selectedEmployeeId}`);
      setContract(prev => ({ ...prev, salaryComponents: data.data }));
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Failed to delete component.' });
    }
  };

  const selectedEmployeeName = employees.find(e => e._id === selectedEmployeeId);
  const fullName = selectedEmployeeName ? `${selectedEmployeeName.firstName} ${selectedEmployeeName.lastName}` : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Personal Department</h1>
          <p className="page-subtitle">Manage employee lifecycle, Egypt compliance docs, and shift schedules</p>
        </div>
      </div>

      {statusMsg.text && (
        <div className={`alert alert-${statusMsg.type === 'error' ? 'error' : 'success'}`}>
          {statusMsg.text}
        </div>
      )}

      {/* HRM Top Sub-Tabs Navigation */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 0, overflowX: 'auto' }}>
        {[
          { id: 'profile', label: '👤 Profile & Schedule' },
          { id: 'contract', label: '📄 Contract Terms' },
          { id: 'docs', label: '🇪🇬 Gov Documents' },
          { id: 'leaves', label: '🌴 Leave & Absence' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'transparent',
              color: activeSubTab === tab.id ? 'var(--accent-secondary)' : 'var(--text-muted)',
              borderBottom: activeSubTab === tab.id ? '2px solid var(--accent-secondary)' : '2px solid transparent',
              fontWeight: activeSubTab === tab.id ? 700 : 400,
              fontSize: 13,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              marginBottom: -1,
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Left Column: Selector */}
        {isHR && (
          <div className="card" style={{ flex: '1 1 260px', maxWidth: 350, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>Select Employee</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <select
                className="form-input"
                value={deptFilter}
                onChange={e => { setDeptFilter(e.target.value); setRoleFilter('All'); }}
                style={{ fontSize: 12, padding: '6px 10px' }}
              >
                <option value="All">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>

              {deptFilter !== 'All' && (
                <select
                  className="form-input"
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  style={{ fontSize: 12, padding: '6px 10px' }}
                >
                  <option value="All">All Job Roles</option>
                  {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
              {filteredEmployees.map(emp => (
                <div
                  key={emp._id}
                  onClick={() => setSelectedEmployeeId(emp._id)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: selectedEmployeeId === emp._id ? 'rgba(37,99,235,0.12)' : 'rgba(255,255,255,0.02)',
                    borderLeft: selectedEmployeeId === emp._id ? '3px solid var(--accent-secondary)' : '3px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ fontWeight: '600', fontSize: 13 }}>{emp.firstName} {emp.lastName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.role}</div>
                  <div style={{ fontSize: 10, color: 'var(--accent-primary)', marginTop: 4 }}>🕒 {emp.shift}</div>
                </div>
              ))}
              {filteredEmployees.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: 20 }}>
                  No employees match filter
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right Column: Active Tab Content */}
        <div style={{ flex: '2 1 600px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {loading && activeSubTab !== 'agents' ? (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <div className="spinner" /> Loading employee data...
            </div>
          ) : (
            <>
              {/* Profile & Shift Schedule Tab */}
              {activeSubTab === 'profile' && selectedEmployeeName && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Basic Profile Details */}
                  <div className="card">
                    <h3 style={{ margin: '0 0 16px 0', fontSize: 15 }}>Personal & Position Information</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Full Name</div>
                        <div style={{ fontWeight: '600', fontSize: 14 }}>{fullName}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Email</div>
                        <div style={{ fontWeight: '600', fontSize: 14 }}>{selectedEmployeeName.email}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Job Role / Position</div>
                        <div style={{ fontWeight: '600', fontSize: 14, color: 'var(--accent-secondary)' }}>{selectedEmployeeName.role}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Manager / Supervisor</div>
                        <div style={{ fontWeight: '600', fontSize: 14 }}>
                          {selectedEmployeeName.supervisor ? `${selectedEmployeeName.supervisor.firstName} ${selectedEmployeeName.supervisor.lastName}` : 'Unassigned'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Month Calendar with Planned AUXes */}
                  {detailedSchedule && (
                    <div className="card">
                      <h3 style={{ margin: '0 0 12px 0', fontSize: 15 }}>🗓️ Month Schedule & Planned AUX Overview</h3>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                        Visual representation of the 4 weeks of the month. Includes daily working shifts, off-days, and planned AUX target durations.
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {(() => {
                          // Generate calendar days for the selected YYYY-MM
                          const [year, monthVal] = selectedMonth.split('-').map(Number);
                          const daysInMonth = new Date(year, monthVal, 0).getDate();
                          const daysList = [];

                          for (let d = 1; d <= daysInMonth; d++) {
                            const dateStr = `${selectedMonth}-${String(d).padStart(2, '0')}`;
                            const dateObj = new Date(year, monthVal - 1, d);
                            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                            
                            // Determine Week key (1-5)
                            const weekIndex = Math.ceil(d / 7);
                            const weekKey = `Week ${weekIndex}`;

                            // Resolve details (Default -> Weekly -> Daily)
                            let currentShift = detailedSchedule.defaultShift || 'Day Shift (09:00 - 17:00)';
                            let isOff = (detailedSchedule.defaultOffDays || ['Friday', 'Saturday']).includes(dayName);
                            let overrideType = 'Default';

                            // Apply Weekly Overrides
                            const weekOverride = (detailedSchedule.weeklyOverrides || {})[weekKey];
                            if (weekOverride) {
                              if (weekOverride.shift) {
                                currentShift = weekOverride.shift;
                                overrideType = 'Weekly';
                              }
                              if (weekOverride.weeklyOffDays) {
                                isOff = weekOverride.weeklyOffDays.includes(dayName);
                                overrideType = 'Weekly';
                              }
                            }

                            // Apply Daily Overrides
                            const dailyOverride = (detailedSchedule.dailyOverrides || {})[dateStr];
                            if (dailyOverride) {
                              if (dailyOverride.shift) {
                                currentShift = dailyOverride.shift;
                                overrideType = 'Daily';
                              }
                              if (dailyOverride.isOffDay !== undefined) {
                                isOff = dailyOverride.isOffDay;
                                overrideType = 'Daily';
                              }
                            }

                            // Retrieve targets
                            const liveVal = detailedSchedule.defaultLiveTarget ?? 480;
                            const breakVal = detailedSchedule.defaultBreakTarget ?? 60;
                            const trainVal = detailedSchedule.defaultTrainingTarget ?? 0;
                            const coachVal = detailedSchedule.defaultCoachingTarget ?? 0;

                            daysList.push({
                              dayNum: d,
                              dayName,
                              weekKey,
                              shift: currentShift,
                              isOff,
                              overrideType,
                              targets: isOff ? { live: 0, break: 0, train: 0, coach: 0 } : { live: liveVal, break: breakVal, train: trainVal, coach: coachVal }
                            });
                          }

                          // Group by weeks
                          const weeks = { 'Week 1': [], 'Week 2': [], 'Week 3': [], 'Week 4': [], 'Week 5': [] };
                          daysList.forEach(day => {
                            if (weeks[day.weekKey]) weeks[day.weekKey].push(day);
                          });

                          return Object.keys(weeks).map(wk => {
                            const weekDays = weeks[wk];
                            if (weekDays.length === 0) return null;
                            return (
                              <div key={wk} style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 12, background: 'rgba(255,255,255,0.01)' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: 13, color: 'var(--accent-secondary)' }}>{wk}</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                                  {weekDays.map(day => (
                                    <div 
                                      key={day.dayNum}
                                      onClick={() => {
                                        const dateStr = `${selectedMonth}-${String(day.dayNum).padStart(2, '0')}`;
                                        setActiveExpandedDay({
                                          ...day,
                                          dateStr
                                        });
                                      }}
                                      style={{
                                        background: day.isOff ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.03)',
                                        border: day.isOff ? '1px dashed rgba(239,68,68,0.2)' : '1px solid var(--border-color)',
                                        borderRadius: 6,
                                        padding: 8,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        minHeight: 110,
                                        cursor: 'pointer',
                                        transition: 'transform 0.15s, border-color 0.15s'
                                      }}
                                      className="calendar-day-card"
                                    >
                                      <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <span style={{ fontSize: 13, fontWeight: 'bold' }}>{day.dayNum}</span>
                                          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{day.dayName.substring(0, 3)}</span>
                                        </div>
                                        
                                        {day.isOff ? (
                                          <div style={{ fontSize: 10, color: '#fca5a5', fontWeight: 600, marginTop: 4 }}>Off-Day</div>
                                        ) : (
                                          <div style={{ fontSize: 10, color: '#93c5fd', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {day.shift.split(' ')[0]} Shift
                                          </div>
                                        )}
                                      </div>

                                      {!day.isOff && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 4, marginTop: 4 }}>
                                          <div style={{ fontSize: 9, color: '#6ee7b7' }}>📞 {day.targets.live}m</div>
                                          <div style={{ fontSize: 9, color: '#fcd34d' }}>☕ {day.targets.break}m</div>
                                          <div style={{ fontSize: 9, color: '#a5b4fc' }}>🎓 {day.targets.train}m</div>
                                          <div style={{ fontSize: 9, color: '#c084fc' }}>👥 {day.targets.coach}m</div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Day Schedule Detail & Staggered AUX Planner Modal */}
                  {activeExpandedDay && (
                    <div style={{
                      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                      background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center',
                      alignItems: 'center', zIndex: 1000, padding: 20
                    }}>
                      <div className="card" style={{ width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--accent-secondary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: 12, marginBottom: 16 }}>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 16 }}>🕒 Day Details & Staggered AUX Planner</h3>
                            <p style={{ margin: '2px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Date: {activeExpandedDay.dateStr} ({activeExpandedDay.dayName})</p>
                          </div>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => setActiveExpandedDay(null)}
                            style={{ padding: '4px 10px', fontSize: 11 }}
                          >
                            Close
                          </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 6, border: '1px solid var(--border-color)' }}>
                            <div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Selected Employee</div>
                              <div style={{ fontWeight: 'bold', fontSize: 13, color: 'var(--accent-secondary)' }}>{fullName}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Planned Status</div>
                              <div style={{ fontWeight: 'bold', fontSize: 13 }}>{activeExpandedDay.isOff ? 'Off-Day' : activeExpandedDay.shift}</div>
                            </div>
                          </div>

                          {!activeExpandedDay.isOff ? (
                            <div>
                              <h4 style={{ margin: '0 0 8px 0', fontSize: 13 }}>Staggered Hour-by-Hour AUX Distribution</h4>
                              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                                Define status for each hour to avoid simultaneous breaks with other department members.
                              </p>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {[
                                  '09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00', '12:00 - 13:00',
                                  '13:00 - 14:00', '14:00 - 15:00', '15:00 - 16:00', '16:00 - 17:00'
                                ].map((hourSlot) => {
                                  // Mock initial staggered configuration based on targets
                                  let defaultVal = 'Live (Online)';
                                  if (hourSlot === '12:00 - 13:00' || hourSlot === '13:00 - 14:00') {
                                    defaultVal = 'Break / Rest';
                                  }
                                  if (hourSlot === '15:00 - 16:00') {
                                    defaultVal = 'Coaching / Training';
                                  }

                                  return (
                                    <div 
                                      key={hourSlot} 
                                      style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '8px 12px', background: 'rgba(255,255,255,0.01)',
                                        border: '1px solid var(--border-color)', borderRadius: 6
                                      }}
                                    >
                                      <span style={{ fontSize: 12, fontWeight: 500 }}>{hourSlot}</span>
                                      <select 
                                        className="form-input" 
                                        defaultValue={defaultVal}
                                        style={{ width: 'auto', padding: '4px 8px', fontSize: 11, height: 'auto', margin: 0 }}
                                      >
                                        <option value="Live (Online)">🟢 Live (Online)</option>
                                        <option value="Break / Rest">☕ Break / Rest</option>
                                        <option value="Coaching / Training">🎓 Training / Coaching</option>
                                        <option value="Offline / Logged out">⚫ Offline / Logged out</option>
                                      </select>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>
                              This day is scheduled as an Off-Day. No staggered hour planning required.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Shift Configurator (HR/Admin only) */}
                  {isHR && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {/* Month Selector Card */}
                      <div className="card" style={{ padding: '16px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ flexGrow: 1 }}>
                          <h3 style={{ margin: 0, fontSize: 15 }}>Select Schedule Target Period</h3>
                          <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Schedules must be initialized monthly, and can be fine-tuned weekly or daily.</p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Target Month</label>
                          <input 
                            type="month" 
                            className="form-input" 
                            value={selectedMonth} 
                            onChange={(e) => setSelectedMonth(e.target.value)} 
                            style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }}
                          />
                        </div>
                      </div>

                      {/* 1. Monthly base schedule */}
                      <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 15 }}>1. Monthly Base Schedule</h3>
                            <p style={{ margin: '2px 0 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Base setup defined at the start of the month.</p>
                          </div>
                          <span style={{ fontSize: 11, background: 'rgba(59,130,246,0.1)', color: '#93c5fd', padding: '2px 8px', borderRadius: 4 }}>Month: {selectedMonth}</span>
                        </div>
                        <form onSubmit={handleSaveShift} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Default Monthly Shift</label>
                            <select className="form-input" value={shift} onChange={(e) => setShift(e.target.value)}>
                              <option value="Day Shift (09:00 - 17:00)">Day Shift (09:00 - 17:00)</option>
                              <option value="Afternoon Shift (15:00 - 23:00)">Afternoon Shift (15:00 - 23:00)</option>
                              <option value="Night Shift (17:00 - 01:00)">Night Shift (17:00 - 01:00)</option>
                              <option value="Overnight Shift (23:00 - 07:00)">Overnight Shift (23:00 - 07:00)</option>
                            </select>
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Default Monthly Off-Days</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                              {['Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'].map((day) => {
                                const active = offDays.includes(day);
                                return (
                                  <button
                                    type="button"
                                    key={day}
                                    onClick={() => {
                                      setOffDays(prev =>
                                        prev.includes(day)
                                          ? prev.filter(d => d !== day)
                                          : [...prev, day]
                                      );
                                    }}
                                    className={`btn ${active ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                                    style={{ padding: '4px 8px', fontSize: 11 }}
                                  >
                                    {day}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">📞 Live (mins)</label>
                              <input type="number" className="form-input" value={defaultLiveTarget} onChange={(e) => setDefaultLiveTarget(e.target.value)} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">☕ Break (mins)</label>
                              <input type="number" className="form-input" value={defaultBreakTarget} onChange={(e) => setDefaultBreakTarget(e.target.value)} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">🎓 Training (mins)</label>
                              <input type="number" className="form-input" value={defaultTrainingTarget} onChange={(e) => setDefaultTrainingTarget(e.target.value)} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">👥 Coaching (mins)</label>
                              <input type="number" className="form-input" value={defaultCoachingTarget} onChange={(e) => setDefaultCoachingTarget(e.target.value)} />
                            </div>
                          </div>

                          <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                              Save Base Monthly Plan
                            </button>
                          </div>
                        </form>
                      </div>

                      {/* 2. Weekly overrides */}
                      <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 15 }}>2. Weekly Schedule Overrides</h3>
                            <p style={{ margin: '2px 0 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Fine-tune or override schedule for a specific week.</p>
                          </div>
                          <select 
                            className="form-input" 
                            value={selectedWeek} 
                            onChange={(e) => setSelectedWeek(e.target.value)}
                            style={{ width: 'auto', padding: '4px 8px', fontSize: 12, height: 'auto' }}
                          >
                            <option value="Week 1">Week 1</option>
                            <option value="Week 2">Week 2</option>
                            <option value="Week 3">Week 3</option>
                            <option value="Week 4">Week 4</option>
                            <option value="Week 5">Week 5</option>
                          </select>
                        </div>

                        <form onSubmit={handleSaveWeeklyOverride} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Weekly Override Shift</label>
                            <select className="form-input" value={weekShift} onChange={(e) => setWeekShift(e.target.value)}>
                              <option value="Day Shift (09:00 - 17:00)">Day Shift (09:00 - 17:00)</option>
                              <option value="Afternoon Shift (15:00 - 23:00)">Afternoon Shift (15:00 - 23:00)</option>
                              <option value="Night Shift (17:00 - 01:00)">Night Shift (17:00 - 01:00)</option>
                              <option value="Overnight Shift (23:00 - 07:00)">Overnight Shift (23:00 - 07:00)</option>
                            </select>
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Weekly Override Off-Days</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                              {['Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'].map((day) => {
                                const active = weekOffDays.includes(day);
                                return (
                                  <button
                                    type="button"
                                    key={day}
                                    onClick={() => {
                                      setWeekOffDays(prev =>
                                        prev.includes(day)
                                          ? prev.filter(d => d !== day)
                                          : [...prev, day]
                                      );
                                    }}
                                    className={`btn ${active ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                                    style={{ padding: '4px 8px', fontSize: 11 }}
                                  >
                                    {day}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                              Save Weekly Override ({selectedWeek})
                            </button>
                          </div>
                        </form>
                      </div>

                      {/* 3. Daily overrides */}
                      <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 15 }}>3. Daily Schedule Overrides</h3>
                            <p style={{ margin: '2px 0 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Fine-tune shift requirements for a specific day.</p>
                          </div>
                          <input 
                            type="date" 
                            className="form-input" 
                            value={selectedDate} 
                            onChange={(e) => setSelectedDate(e.target.value)}
                            style={{ width: 'auto', padding: '4px 8px', fontSize: 12, height: 'auto' }}
                          />
                        </div>

                        <form onSubmit={handleSaveDailyOverride} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Daily Shift</label>
                            <select className="form-input" value={dailyShift} onChange={(e) => setDailyShift(e.target.value)} disabled={dailyIsOff}>
                              <option value="Day Shift (09:00 - 17:00)">Day Shift (09:00 - 17:00)</option>
                              <option value="Afternoon Shift (15:00 - 23:00)">Afternoon Shift (15:00 - 23:00)</option>
                              <option value="Night Shift (17:00 - 01:00)">Night Shift (17:00 - 01:00)</option>
                              <option value="Overnight Shift (23:00 - 07:00)">Overnight Shift (23:00 - 07:00)</option>
                            </select>
                          </div>

                          <div className="form-group" style={{ margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0 }}>
                              <input 
                                type="checkbox" 
                                checked={dailyIsOff} 
                                onChange={(e) => setDailyIsOff(e.target.checked)}
                                style={{ width: 16, height: 16 }}
                              />
                              <span>Mark as Off-Day Override</span>
                            </label>
                          </div>

                          <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                              Save Daily Override ({selectedDate})
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Contract Terms Tab */}
              {activeSubTab === 'contract' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                  {/* ── Basic contract fields ── */}
                  <div className="card">
                    <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>
                      {isHR ? `Contract Terms: ${fullName}` : 'My Employment Contract'}
                    </h3>
                    <form onSubmit={handleSaveContract} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Base Salary (EGP)</label>
                        <input className="form-input" type="number" value={baseSalary} onChange={e => setBaseSalary(e.target.value)} disabled={!isHR} required />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Net Salary (EGP)</label>
                        <input className="form-input" type="number" value={netSalary} onChange={e => setNetSalary(e.target.value)} disabled={!isHR} required />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Hire Date</label>
                        <input className="form-input" type="date" value={hireDate} onChange={e => setHireDate(e.target.value)} disabled={!isHR} required />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Contract End Date</label>
                        <input className="form-input" type="date" value={contractEndDate} onChange={e => setContractEndDate(e.target.value)} disabled={!isHR} />
                      </div>
                      {isHR && (
                        <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Contract Terms'}
                          </button>
                        </div>
                      )}
                    </form>
                  </div>

                  {/* ── Signed Contract + Salary Components (combined card) ── */}
                  <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border-color)' }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>Signed Contract</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Official signed copy on file</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {contract?.signedContractFile ? (
                          <a href={`http://localhost:5000${contract.signedContractFile}`} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 12, color: 'var(--accent-secondary)', textDecoration: 'none', padding: '5px 12px', border: '1px solid var(--accent-secondary)33', borderRadius: 6, background: 'rgba(99,102,241,0.06)' }}>
                            View Document
                          </a>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No file on record</span>
                        )}
                        {isHR && (
                          <>
                            <label htmlFor="signed-contract-file"
                              style={{ fontSize: 12, padding: '5px 14px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: uploadingDoc === 'signed' ? 'not-allowed' : 'pointer', fontWeight: 500 }}>
                              {uploadingDoc === 'signed' ? 'Uploading...' : contract?.signedContractFile ? 'Replace File' : 'Upload File'}
                            </label>
                            <input id="signed-contract-file" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style={{ display: 'none' }} disabled={uploadingDoc === 'signed'}
                              onChange={async e => {
                                const file = e.target.files[0];
                                if (!file) return;
                                setUploadingDoc('signed');
                                setStatusMsg({ type: '', text: '' });
                                try {
                                  const fd = new FormData();
                                  fd.append('contractFile', file);
                                  fd.append('employeeId', selectedEmployeeId);
                                  const { data } = await API.post('/hrm/contracts/signed-copy', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                                  setContract(prev => ({ ...prev, signedContractFile: data.fileUrl }));
                                  setStatusMsg({ type: 'success', text: 'Signed contract uploaded.' });
                                } catch (err) {
                                  setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Upload failed.' });
                                } finally { setUploadingDoc(''); e.target.value = ''; }
                              }} />
                          </>
                        )}
                      </div>
                    </div>

                    {/* Salary Components */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>Salary Components</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Earnings and deductions applied on top of base salary</div>
                      </div>
                    </div>

                    {/* Add / Edit form — HR only */}
                    {isHR && (
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 2fr auto', gap: 10, alignItems: 'flex-end', marginBottom: 20, padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">Component Label</label>
                          <input className="form-input" placeholder="e.g. KPI Bonus" value={compForm.label} onChange={e => setCompForm(p => ({ ...p, label: e.target.value }))} />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">Type</label>
                          <select className="form-input" value={compForm.type} onChange={e => setCompForm(p => ({ ...p, type: e.target.value }))}>
                            <option value="Earning">Earning</option>
                            <option value="Deduction">Deduction</option>
                          </select>
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">Value Type</label>
                          <select className="form-input" value={compForm.valueType} onChange={e => setCompForm(p => ({ ...p, valueType: e.target.value }))}>
                            <option value="Fixed">Fixed (EGP)</option>
                            <option value="Percentage">Percentage (%)</option>
                          </select>
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">{compForm.valueType === 'Percentage' ? 'Percentage' : 'Amount (EGP)'}</label>
                          <input className="form-input" type="number" min="0" placeholder={compForm.valueType === 'Percentage' ? '0 – 100' : '0.00'} value={compForm.value} onChange={e => setCompForm(p => ({ ...p, value: e.target.value }))} />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>Note</span>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 400, cursor: 'pointer', fontSize: 11 }}>
                              <input type="checkbox" checked={compForm.kpiLinked} onChange={e => setCompForm(p => ({ ...p, kpiLinked: e.target.checked }))} style={{ width: 13, height: 13 }} />
                              KPI-linked
                            </label>
                          </label>
                          <input className="form-input" placeholder="Optional note" value={compForm.note} onChange={e => setCompForm(p => ({ ...p, note: e.target.value }))} />
                        </div>
                        <div style={{ display: 'flex', gap: 6, paddingBottom: 1 }}>
                          <button className="btn btn-primary btn-sm" onClick={saveComponent} disabled={savingComp || !compForm.label || !compForm.value}>
                            {compForm.editId ? 'Update' : 'Add'}
                          </button>
                          {compForm.editId && (
                            <button className="btn btn-secondary btn-sm" onClick={() => setCompForm({ label: '', type: 'Earning', valueType: 'Fixed', value: '', kpiLinked: false, note: '', editId: null })}>Cancel</button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Components table */}
                    {(() => {
                      const components = contract?.salaryComponents || [];
                      const earnings   = components.filter(c => c.type === 'Earning');
                      const deductions = components.filter(c => c.type === 'Deduction');
                      const totalEarnings   = earnings.reduce((s, c) => s + (c.valueType === 'Percentage' ? (baseSalary * c.value / 100) : c.value), 0);
                      const totalDeductions = deductions.reduce((s, c) => s + (c.valueType === 'Percentage' ? (baseSalary * c.value / 100) : c.value), 0);
                      if (components.length === 0) return (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '28px 0', fontSize: 13, border: '1px dashed var(--border-color)', borderRadius: 8 }}>
                          No salary components configured yet.
                        </div>
                      );
                      return (
                        <>
                          {[{ label: 'Earnings', items: earnings, color: '#10B981' }, { label: 'Deductions', items: deductions, color: '#EF4444' }].map(group =>
                            group.items.length === 0 ? null : (
                              <div key={group.label} style={{ marginBottom: 20 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: group.color, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{group.label}</div>
                                <div className="table-wrapper">
                                  <table>
                                    <thead><tr><th>Label</th><th>Value</th><th>EGP Equivalent</th><th>KPI-Linked</th><th>Note</th>{isHR && <th>Actions</th>}</tr></thead>
                                    <tbody>
                                      {group.items.map(c => {
                                        const egp = c.valueType === 'Percentage' ? Math.round(baseSalary * c.value / 100) : c.value;
                                        return (
                                          <tr key={c._id}>
                                            <td style={{ fontWeight: 600 }}>{c.label}</td>
                                            <td><span style={{ fontWeight: 700, color: group.color }}>{c.valueType === 'Percentage' ? `${c.value}%` : `${Number(c.value).toLocaleString()} EGP`}</span></td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{egp.toLocaleString()} EGP</td>
                                            <td><span style={{ fontSize: 12, color: c.kpiLinked ? '#F59E0B' : 'var(--text-muted)' }}>{c.kpiLinked ? 'Yes' : 'No'}</span></td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.note || '—'}</td>
                                            {isHR && <td>
                                              <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: '3px 10px' }}
                                                  onClick={() => setCompForm({ label: c.label, type: c.type, valueType: c.valueType, value: c.value, kpiLinked: c.kpiLinked, note: c.note || '', editId: c._id })}>Edit</button>
                                                <button className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: '3px 10px', color: 'var(--accent-danger)' }}
                                                  onClick={() => deleteComponent(c._id)}>Remove</button>
                                              </div>
                                            </td>}
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )
                          )}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 4, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
                            {[
                              { label: 'Base Salary', value: Number(baseSalary), color: 'var(--text-primary)' },
                              { label: 'Total Earnings', value: totalEarnings, color: '#10B981' },
                              { label: 'Total Deductions', value: totalDeductions, color: '#EF4444' },
                              { label: 'Adjusted Net', value: Number(baseSalary) + totalEarnings - totalDeductions, color: 'var(--accent-primary)', bold: true },
                            ].map(({ label, value, color, bold }) => (
                              <div key={label} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px', borderLeft: `3px solid ${color}` }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                                <div style={{ fontWeight: bold ? 800 : 600, fontSize: bold ? 16 : 14, color }}>{value.toLocaleString()} EGP</div>
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Salary History */}
                  {contract?.salaryHistory?.length > 0 && (
                    <div className="card">
                      <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>📈 Salary History</h3>
                      <div className="table-wrapper">
                        <table>
                          <thead><tr><th>Date</th><th>Net Salary</th><th>Changed By</th><th>Reason</th></tr></thead>
                          <tbody>
                            {[...contract.salaryHistory].reverse().map((h, i) => (
                              <tr key={i}>
                                <td style={{ fontSize: 12 }}>{new Date(h.changedAt).toLocaleDateString()}</td>
                                <td style={{ fontWeight: 600 }}>{(h.amount || 0).toLocaleString()} EGP</td>
                                <td style={{ fontSize: 12 }}>{h.changedBy ? `${h.changedBy.firstName} ${h.changedBy.lastName}` : '—'}</td>
                                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{h.reason || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Egyptian Gov Documents Tab */}
              {activeSubTab === 'docs' && (
                <div className="card">
                  <h3 style={{ margin: '0 0 20px 0', fontSize: 15 }}>Governmental Documents (Egypt Compliance)</h3>
                  {!contract && isHR ? (
                    <p style={{ color: 'var(--text-muted)' }}>Create a contract first to enable document management.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {[
                        { key: 'nationalId', label: 'National ID (الرقم القومي)' },
                        { key: 'socialInsurance', label: 'Social Insurance Certificate (برنت التأمينات)' },
                        { key: 'militaryStatus', label: 'Military Status (موقف التجنيد)' },
                        { key: 'graduationCertificate', label: 'Graduation Certificate (شهادة التخرج)' },
                        { key: 'criminalRecord', label: 'Criminal Record / Fish (فيش جنائي)' }
                      ].map((doc) => {
                        const docUrl = govDocs[doc.key] || '';
                        const docDetails = govDocsDetails[doc.key] || { status: 'Pending Upload', remarks: '' };
                        const style = STATUS_COLORS[docDetails.status] || STATUS_COLORS['Pending Upload'];

                        return (
                          <div
                            key={doc.key}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              padding: '16px',
                              background: 'rgba(255,255,255,0.02)',
                              borderRadius: '8px',
                              border: '1px solid var(--border-color)',
                              gap: 12
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <strong style={{ fontSize: 14 }}>{doc.label}</strong>
                                {docUrl && (
                                  <div style={{ fontSize: 11, marginTop: 3 }}>
                                    {docUrl.startsWith('/uploads') ? (
                                      <a
                                        href={`http://localhost:5000${docUrl}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: 'var(--accent-secondary)', textDecoration: 'underline' }}
                                      >
                                        📎 View / Download File
                                      </a>
                                    ) : (
                                      <span style={{ color: 'var(--accent-secondary)' }}>📄 {docUrl}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <span style={{
                                padding: '4px 10px',
                                borderRadius: 12,
                                fontSize: 11,
                                fontWeight: 700,
                                background: style.bg,
                                color: style.text,
                                border: `1px solid ${style.border}`,
                              }}>
                                {docDetails.status}
                              </span>
                            </div>

                            {docDetails.remarks && (
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'rgba(0,0,0,0.15)', padding: '6px 10px', borderRadius: 4 }}>
                                💬 Remarks: {docDetails.remarks}
                              </div>
                            )}

                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10, alignItems: 'flex-start', flexDirection: 'column' }}>
                              {/* HR Upload soft copy */}
                              {isHR && (
                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
                                  <label
                                    htmlFor={`file-${doc.key}`}
                                    style={{
                                      display: 'inline-flex', alignItems: 'center', gap: 6,
                                      padding: '5px 12px', borderRadius: 6, fontSize: 12,
                                      background: 'rgba(99,102,241,0.12)', color: '#a5b4fc',
                                      border: '1px dashed rgba(99,102,241,0.4)',
                                      cursor: 'pointer', fontWeight: 600
                                    }}
                                  >
                                    {uploadingDoc === doc.key ? '⏳ Uploading...' : '📤 Upload Soft Copy'}
                                  </label>
                                  <input
                                    id={`file-${doc.key}`}
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx"
                                    style={{ display: 'none' }}
                                    disabled={uploadingDoc === doc.key}
                                    onChange={(e) => {
                                      if (e.target.files[0]) {
                                        handleGovDocFileUpload(doc.key, e.target.files[0]);
                                        e.target.value = '';
                                      }
                                    }}
                                  />
                                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>PDF, Image, or Word · max 10 MB</span>
                                </div>
                              )}
                              {/* Non-HR: text link submission */}
                              {!isHR && (
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                  <input
                                    type="text"
                                    placeholder="Enter link / file name"
                                    defaultValue={docUrl}
                                    onBlur={(e) => {
                                      if (e.target.value.trim() !== '') {
                                        handleDocUpload(doc.key, e.target.value.trim());
                                      }
                                    }}
                                    className="form-input"
                                    style={{ padding: '4px 8px', fontSize: 12, height: 'auto', width: 220 }}
                                  />
                                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Press click away to submit</span>
                                </div>
                              )}
                              {/* HR Approve / Reject section */}
                              {isHR && docUrl && (
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
                                  <input
                                    type="text"
                                    id={`remarks-${doc.key}`}
                                    placeholder="Verification remarks/reason..."
                                    className="form-input"
                                    style={{ padding: '4px 8px', fontSize: 12, height: 'auto', flexGrow: 1 }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const remarksVal = document.getElementById(`remarks-${doc.key}`).value;
                                      handleVerifyDoc(doc.key, 'Approved', remarksVal);
                                    }}
                                    className="btn btn-primary btn-sm"
                                    style={{ padding: '4px 10px', fontSize: 11 }}
                                  >
                                    ✓ Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const remarksVal = document.getElementById(`remarks-${doc.key}`).value;
                                      handleVerifyDoc(doc.key, 'Rejected', remarksVal);
                                    }}
                                    className="btn btn-secondary btn-sm"
                                    style={{ padding: '4px 10px', fontSize: 11 }}
                                  >
                                    ✗ Reject
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Leave & Absence Tab */}
              {activeSubTab === 'leaves' && (
                <div className="card">
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 15 }}>Leaves & Absence Requests</h3>

                  {/* Balance bar */}
                  {leaveBalance && (() => {
                    const { total, used, remaining } = leaveBalance;
                    const pct = Math.min(100, Math.round((used / total) * 100));
                    const overUsed = used > total;
                    return (
                      <div style={{ marginBottom: 20, padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>Annual Leave Balance</span>
                          <div style={{ display: 'flex', gap: 16 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total: <strong style={{ color: 'var(--text-primary)' }}>{total} days</strong></span>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Used: <strong style={{ color: used > 0 ? '#F59E0B' : 'var(--text-primary)' }}>{used} days</strong></span>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Remaining: <strong style={{ color: remaining > 0 ? '#10B981' : '#EF4444' }}>{remaining} paid days</strong></span>
                          </div>
                        </div>
                        <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: overUsed ? '#EF4444' : pct > 80 ? '#F59E0B' : '#10B981', borderRadius: 4, transition: 'width 0.4s' }} />
                        </div>
                        {remaining === 0 && (
                          <div style={{ fontSize: 11, color: '#EF4444', marginTop: 6 }}>All paid days exhausted — further approved leaves will be unpaid.</div>
                        )}
                      </div>
                    );
                  })()}

                  <form onSubmit={handleRequestLeave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24, borderBottom: '1px solid var(--border-color)', paddingBottom: 24 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Leave Type</label>
                      <select className="form-input" value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
                        <option value="Annual">Annual Leave</option>
                        <option value="Sick">Sick Leave</option>
                        <option value="Casual">Casual Leave</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Start Date</label>
                      <input className="form-input" type="date" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} required />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">End Date</label>
                      <input className="form-input" type="date" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} required />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Reason / Comments</label>
                      <input className="form-input" placeholder="e.g. Travel, medical examination" value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} required />
                    </div>
                    {leaveStart && leaveEnd && leaveBalance && (() => {
                      const days = Math.max(1, Math.round((new Date(leaveEnd) - new Date(leaveStart)) / 86400000) + 1);
                      const paid = Math.min(days, leaveBalance.remaining);
                      const unpaid = days - paid;
                      return (
                        <div style={{ gridColumn: 'span 2', fontSize: 12, color: 'var(--text-muted)', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                          This request covers <strong style={{ color: 'var(--text-primary)' }}>{days} day{days > 1 ? 's' : ''}</strong>:
                          {paid > 0 && <span style={{ color: '#10B981', marginLeft: 8 }}>{paid} paid</span>}
                          {unpaid > 0 && <span style={{ color: '#EF4444', marginLeft: 8 }}>{unpaid} unpaid</span>}
                        </div>
                      );
                    })()}
                    <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                        Request Absence
                      </button>
                    </div>
                  </form>

                  <h4 style={{ margin: '0 0 12px 0', fontSize: 14 }}>Absence Logs</h4>
                  {leaves.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No leave records found.</p>
                  ) : (
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Employee</th>
                            <th>Type & Reason</th>
                            <th>Period</th>
                            <th>Days</th>
                            <th>Status</th>
                            {isHR && <th>Approvals</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {leaves.map((lv) => {
                            const empName = lv.employeeId ? `${lv.employeeId.firstName} ${lv.employeeId.lastName}` : 'Self';
                            const style = STATUS_COLORS[lv.status] || STATUS_COLORS.Pending;
                            return (
                              <tr key={lv._id}>
                                <td>
                                  <strong>{empName}</strong>
                                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{lv.employeeId?.role}</div>
                                </td>
                                <td>
                                  <strong>{lv.leaveType}</strong>
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{lv.reason}</div>
                                </td>
                                <td style={{ fontSize: 12 }}>
                                  {new Date(lv.startDate).toLocaleDateString()} — {new Date(lv.endDate).toLocaleDateString()}
                                </td>
                                <td style={{ fontSize: 12 }}>
                                  <div>{lv.daysCount || 1} day{(lv.daysCount || 1) > 1 ? 's' : ''}</div>
                                  <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                                    {(lv.paidDays > 0) && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(16,185,129,0.12)', color: '#6EE7B7', border: '1px solid #10B98133' }}>{lv.paidDays}d paid</span>}
                                    {(lv.unpaidDays > 0) && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.12)', color: '#FCA5A5', border: '1px solid #EF444433' }}>{lv.unpaidDays}d unpaid</span>}
                                  </div>
                                </td>
                                <td>
                                  <span style={{
                                    display: 'inline-block', padding: '3px 8px', borderRadius: 12,
                                    fontSize: 11, fontWeight: 700,
                                    background: style.bg, color: style.text,
                                    border: `1px solid ${style.border}`,
                                  }}>
                                    {lv.status}
                                  </span>
                                </td>
                                {isHR && (
                                  <td>
                                    {lv.status === 'Pending' && (
                                      <div style={{ display: 'flex', gap: 6 }}>
                                        <button onClick={() => handleUpdateLeaveStatus(lv._id, 'Approved')} className="btn btn-primary btn-sm" style={{ padding: '2px 6px', fontSize: 10 }}>Approve</button>
                                        <button onClick={() => handleUpdateLeaveStatus(lv._id, 'Rejected')} className="btn btn-secondary btn-sm" style={{ padding: '2px 6px', fontSize: 10 }}>Reject</button>
                                      </div>
                                    )}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* AI Agent Hub Tab */}
              {activeSubTab === 'agents' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* 1. Personal Employee Assistant */}
                  <div className="card">
                    <h3 style={{ margin: '0 0 4px 0', fontSize: 15 }}>🤖 Personal AI Agent (Employee Assistant)</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                      Ask questions about your leaves, schedules, active contracts, assets, or document expirations.
                    </p>
                    
                    <div style={{
                      background: 'rgba(0,0,0,0.15)',
                      borderRadius: 8,
                      padding: 16,
                      maxHeight: 200,
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      marginBottom: 12,
                      border: '1px solid var(--border-color)'
                    }}>
                      {employeeChatLog.map((chat, i) => (
                        <div key={i} style={{
                          alignSelf: chat.role === 'user' ? 'flex-end' : 'flex-start',
                          background: chat.role === 'user' ? 'var(--accent-primary)20' : 'rgba(255,255,255,0.03)',
                          border: chat.role === 'user' ? '1px solid var(--accent-primary)40' : '1px solid var(--border-color)',
                          borderRadius: 8,
                          padding: '8px 12px',
                          maxWidth: '85%',
                          fontSize: 13,
                          lineHeight: 1.4
                        }}>
                          {chat.text}
                        </div>
                      ))}
                    </div>

                    <form onSubmit={submitEmployeeQuery} style={{ display: 'flex', gap: 8 }}>
                      <input
                        className="form-input"
                        placeholder="e.g. How many vacation days do I have? Or: Download my contract."
                        value={employeeQuery}
                        onChange={(e) => setEmployeeQuery(e.target.value)}
                        disabled={sendingQuery}
                      />
                      <button type="submit" className="btn btn-primary btn-sm" disabled={sendingQuery}>
                        {sendingQuery ? '...' : 'Send'}
                      </button>
                    </form>
                  </div>

                  {/* 2. HR Manager Copilot */}
                  {isHR && (
                    <div className="card">
                      <h3 style={{ margin: '0 0 4px 0', fontSize: 15 }}>💼 AI HR Manager Agent (Supervisor Copilot)</h3>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                        Get supervisor analysis of team attendance, lateness trends, compliance metrics, and burnout flags.
                      </p>

                      <div style={{
                        background: 'rgba(0,0,0,0.15)',
                        borderRadius: 8,
                        padding: 16,
                        maxHeight: 200,
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        marginBottom: 12,
                        border: '1px solid var(--border-color)'
                      }}>
                        {managerChatLog.map((chat, i) => (
                          <div key={i} style={{
                            alignSelf: chat.role === 'user' ? 'flex-end' : 'flex-start',
                            background: chat.role === 'user' ? 'var(--accent-secondary)20' : 'rgba(255,255,255,0.03)',
                            border: chat.role === 'user' ? '1px solid var(--accent-secondary)40' : '1px solid var(--border-color)',
                            borderRadius: 8,
                            padding: '8px 12px',
                            maxWidth: '85%',
                            fontSize: 13,
                            lineHeight: 1.4
                          }}>
                            {chat.text}
                          </div>
                        ))}
                      </div>

                      <form onSubmit={submitManagerQuery} style={{ display: 'flex', gap: 8 }}>
                        <input
                          className="form-input"
                          placeholder="e.g. Any lateness trends? Or: Scan for missing documents."
                          value={managerQuery}
                          onChange={(e) => setManagerQuery(e.target.value)}
                          disabled={sendingManagerQuery}
                        />
                        <button type="submit" className="btn btn-primary btn-sm" style={{ background: 'var(--accent-secondary)' }} disabled={sendingManagerQuery}>
                          {sendingManagerQuery ? '...' : 'Query'}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalPage;
