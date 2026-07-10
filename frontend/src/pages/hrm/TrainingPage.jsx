import { useState, useEffect, useMemo } from 'react';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DEPARTMENTS } from '../../services/departmentJobs';

// Star rating input component
const StarRatingInput = ({ value, onChange, max = 5 }) => (
  <div style={{ display: 'flex', gap: 4 }}>
    {Array.from({ length: max }).map((_, i) => (
      <button
        key={i}
        type="button"
        onClick={() => onChange(i + 1)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 22,
          color: i < value ? '#F59E0B' : 'rgba(255,255,255,0.15)',
          padding: '0 1px',
          lineHeight: 1,
          transition: 'color 0.15s',
        }}
      >
        ★
      </button>
    ))}
  </div>
);

// Star rating display component
const StarRatingDisplay = ({ value, max = 5 }) => (
  <span>
    {Array.from({ length: max }).map((_, i) => (
      <span key={i} style={{ color: i < value ? '#F59E0B' : 'rgba(255,255,255,0.18)', fontSize: 13 }}>★</span>
    ))}
    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 5 }}>({value}/{max})</span>
  </span>
);

import { useAux } from '../../context/AuxContext';

const AUX_COLORS = {
  Live: '#10B981',
  Training: '#F59E0B',
  'Logged out': '#EF4444',
  Break: '#6366F1',
  Coaching: '#3B82F6',
};
const AUX_ICONS = { Live: '🟢', Training: '🟡', 'Logged out': '🔴', Break: '🟣', Coaching: '🔵' };

const TrainingPage = () => {
  const { user } = useAuth();
  const { currentAux, changeAux, teamAux, fetchTeam } = useAux();
  const [trainings, setTrainings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // AUX filters
  const [auxDeptFilter, setAuxDeptFilter] = useState('All');
  const [auxSearch, setAuxSearch] = useState('');

  // Create Training form
  const [employeeId, setEmployeeId] = useState('');
  const [empDeptFilter, setEmpDeptFilter] = useState('All');
  const [trainingType, setTrainingType] = useState('HR');
  const [assignedTrainerId, setAssignedTrainerId] = useState('');
  const [topic, setTopic] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Training list filters
  const [listSearch, setListSearch] = useState('');
  const [listDeptFilter, setListDeptFilter] = useState('All');
  const [listStatusFilter, setListStatusFilter] = useState('All');
  const [listTypeFilter, setListTypeFilter] = useState('All');

  // Follow-up modal
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [reportStatus, setReportStatus] = useState('Assigned');
  const [reportText, setReportText] = useState('');
  const [reportStars, setReportStars] = useState(0);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [usersRes, trainingRes] = await Promise.all([
        API.get('/auth/users-list'),
        API.get('/hrm/trainings'),
      ]);
      setEmployees(usersRes.data?.data || []);
      setTrainings(trainingRes.data?.data || []);
      fetchTeam();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreateTraining = async (e) => {
    e.preventDefault();
    if (!employeeId || !assignedTrainerId || !topic) {
      setStatusMsg({ type: 'error', text: 'All fields are required.' });
      return;
    }
    setSubmitting(true);
    setStatusMsg({ type: '', text: '' });
    try {
      await API.post('/hrm/trainings', {
        employeeId,
        type: trainingType,
        assignedTrainerId,
        topic,
        scheduledDate: scheduledDate || undefined,
      });
      setStatusMsg({ type: 'success', text: `Training program "${topic}" assigned successfully. ${trainingType === 'Technical' ? 'Supervisor notified via internal email.' : ''}` });
      setTopic('');
      setScheduledDate('');
      setEmployeeId('');
      setAssignedTrainerId('');
      fetchAll();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Failed to assign training.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateReport = async (e) => {
    e.preventDefault();
    if (!selectedTraining) return;
    setSubmitting(true);
    try {
      await API.put(`/hrm/trainings/${selectedTraining._id}`, {
        status: reportStatus,
        report: reportText,
        performanceRating: reportStars || undefined,
      });
      setStatusMsg({ type: 'success', text: 'Follow-up report submitted with performance rating.' });
      setSelectedTraining(null);
      setReportText('');
      setReportStars(0);
      fetchAll();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update report.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAux = async (status) => {
    try {
      await changeAux(status);
      setStatusMsg({ type: 'success', text: `Status changed to "${status}".` });
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Failed to update presence status.' });
    }
  };

  const isHR = ['HRM System Administrator', 'HR Manager', 'Training and Development Specialist', 'Super CRM Administrator'].includes(user?.role);

  // Derive departments for filter dropdowns
  const deptOptions = useMemo(() => {
    const depts = new Set(teamAux.map((t) => t.department || t.role));
    return ['All', ...Array.from(depts)];
  }, [teamAux]);

  // Filtered AUX team
  const filteredAux = useMemo(() => {
    return teamAux.filter((t) => {
      const nameMatch = `${t.firstName} ${t.lastName}`.toLowerCase().includes(auxSearch.toLowerCase());
      const deptMatch = auxDeptFilter === 'All' || t.department === auxDeptFilter || t.role === auxDeptFilter;
      return nameMatch && deptMatch;
    });
  }, [teamAux, auxSearch, auxDeptFilter]);

  // AUX stats
  const auxStats = useMemo(() => ({
    live: teamAux.filter((t) => t.auxStatus === 'Live').length,
    training: teamAux.filter((t) => t.auxStatus === 'Training').length,
    break: teamAux.filter((t) => t.auxStatus === 'Break').length,
    out: teamAux.filter((t) => t.auxStatus === 'Logged out').length,
  }), [teamAux]);

  // Filtered training list
  const filteredTrainings = useMemo(() => {
    return trainings.filter((tr) => {
      const name = `${tr.employeeId?.firstName || ''} ${tr.employeeId?.lastName || ''}`.toLowerCase();
      const trainer = `${tr.assignedTrainerId?.firstName || ''} ${tr.assignedTrainerId?.lastName || ''}`.toLowerCase();
      const textMatch = listSearch === '' ||
        name.includes(listSearch.toLowerCase()) ||
        trainer.includes(listSearch.toLowerCase()) ||
        (tr.topic || '').toLowerCase().includes(listSearch.toLowerCase());
      const deptMatch = listDeptFilter === 'All' || tr.employeeId?.role === listDeptFilter;
      const statusMatch = listStatusFilter === 'All' || tr.status === listStatusFilter;
      const typeMatch = listTypeFilter === 'All' || tr.type === listTypeFilter;
      return textMatch && deptMatch && statusMatch && typeMatch;
    });
  }, [trainings, listSearch, listDeptFilter, listStatusFilter, listTypeFilter]);

  const STATUS_BADGE = {
    Completed: { bg: '#10B981', label: '✓ Completed' },
    'In Progress': { bg: '#3B82F6', label: '↻ In Progress' },
    Assigned: { bg: '#6B7280', label: '○ Assigned' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Training Department</h1>
          <p className="page-subtitle">
            Track HR courses, technical supervisor tutorials, AUX presence, and performance ratings
          </p>
        </div>
      </div>

      {statusMsg.text && (
        <div className={`alert alert-${statusMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 0 }}>
          {statusMsg.text}
        </div>
      )}

      {/* ── AUX Presence Section ── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {/* My Status Switcher */}
        <div className="card" style={{ flex: '0 0 260px' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: 15 }}>My Presence Status</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['Live', 'Training', 'Coaching', 'Break', 'Logged out'].map((st) => (
              <button
                key={st}
                onClick={() => handleUpdateAux(st)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 14px',
                  borderRadius: 8,
                  border: currentAux === st ? `2px solid ${AUX_COLORS[st]}` : '1px solid var(--border-color)',
                  background: currentAux === st ? `${AUX_COLORS[st]}18` : 'transparent',
                  color: currentAux === st ? AUX_COLORS[st] : 'var(--text-primary)',
                  fontWeight: currentAux === st ? 700 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: AUX_COLORS[st], flexShrink: 0, display: 'inline-block' }} />
                {AUX_ICONS[st]} {st}
              </button>
            ))}
          </div>
        </div>

        {/* Team AUX Dashboard */}
        <div className="card" style={{ flex: '1 1 400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>Team Presence Dashboard</h3>
            {/* Quick stats */}
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { label: 'Live', count: auxStats.live, color: '#10B981' },
                { label: 'Training', count: auxStats.training, color: '#F59E0B' },
                { label: 'Break', count: auxStats.break, color: '#6366F1' },
                { label: 'Out', count: auxStats.out, color: '#EF4444' },
              ].map((s) => (
                <div key={s.label} style={{ textAlign: 'center', minWidth: 40 }}>
                  <div style={{ fontWeight: 700, fontSize: 18, color: s.color }}>{s.count}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <input
              className="form-input"
              style={{ flex: '1 1 160px', padding: '6px 10px', fontSize: 12 }}
              placeholder="Search name…"
              value={auxSearch}
              onChange={(e) => setAuxSearch(e.target.value)}
            />
            <select
              className="form-input"
              style={{ flex: '0 1 140px', padding: '6px 10px', fontSize: 12 }}
              value={auxDeptFilter}
              onChange={(e) => setAuxDeptFilter(e.target.value)}
            >
              {deptOptions.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>

          {/* Members grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10, maxHeight: 220, overflowY: 'auto' }}>
            {filteredAux.map((t) => {
              const color = AUX_COLORS[t.auxStatus] || '#6B7280';
              return (
                <div
                  key={t._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    background: `${color}0f`,
                    borderRadius: 8,
                    border: `1px solid ${color}30`,
                  }}
                >
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{t.firstName} {t.lastName}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.role}</div>
                  </div>
                </div>
              );
            })}
            {filteredAux.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 16 }}>
                No members found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Training Management ── */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {/* Assign Training Form */}
        {isHR && (
          <div className="card" style={{ flex: '1 1 320px' }}>
            <h3 style={{ margin: '0 0 18px 0', fontSize: 15 }}>Assign Training Program</h3>
            <form onSubmit={handleCreateTraining} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Department</label>
                <select
                  className="form-input"
                  value={empDeptFilter}
                  onChange={e => { setEmpDeptFilter(e.target.value); setEmployeeId(''); }}
                >
                  <option value="All">All Departments</option>
                  {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Employee</label>
                <select className="form-input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
                  <option value="">Select Employee…</option>
                  {employees
                    .filter(e => empDeptFilter === 'All' || DEPARTMENTS.find(d => d.id === empDeptFilter)?.roles.includes(e.role))
                    .map((e) => (
                      <option key={e._id} value={e._id}>{e.firstName} {e.lastName} · {e.role}</option>
                    ))}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Training Type</label>
                <select className="form-input" value={trainingType} onChange={(e) => setTrainingType(e.target.value)} required>
                  <option value="HR">HR / General Rules</option>
                  <option value="Technical">Technical (Supervisor Assigned)</option>
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Trainer / Supervisor</label>
                <select className="form-input" value={assignedTrainerId} onChange={(e) => setAssignedTrainerId(e.target.value)} required>
                  <option value="">Select Trainer…</option>
                  {employees.map((e) => (
                    <option key={e._id} value={e._id}>{e.firstName} {e.lastName} · {e.role}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Training Topic / Course</label>
                <input className="form-input" value={topic} onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Sales Pipeline, Company Policy 101" required />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Scheduled Date (optional)</label>
                <input className="form-input" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
              </div>
              {trainingType === 'Technical' && (
                <div style={{ padding: '8px 12px', borderRadius: 6, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', fontSize: 12, color: '#818CF8' }}>
                  💡 Supervisor will receive an internal email notification automatically.
                </div>
              )}
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Assigning…' : 'Assign Program'}
              </button>
            </form>
          </div>
        )}

        {/* Training Records */}
        <div className="card" style={{ flex: '2 1 480px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>Training Records</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filteredTrainings.length} / {trainings.length} records</span>
          </div>

          {/* Filters bar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <input
              className="form-input"
              style={{ flex: '1 1 160px', padding: '6px 10px', fontSize: 12 }}
              placeholder="Search employee, trainer, topic…"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
            />
            {[
              { value: listStatusFilter, onChange: setListStatusFilter, options: ['All', 'Assigned', 'In Progress', 'Completed'], label: 'Status' },
              { value: listTypeFilter, onChange: setListTypeFilter, options: ['All', 'HR', 'Technical'], label: 'Type' },
            ].map((f) => (
              <select key={f.label} className="form-input" style={{ flex: '0 1 120px', padding: '6px 10px', fontSize: 12 }}
                value={f.value} onChange={(e) => f.onChange(e.target.value)}>
                {f.options.map((o) => <option key={o}>{o}</option>)}
              </select>
            ))}
          </div>

          {loading ? (
            <div className="loading-state">Loading records…</div>
          ) : filteredTrainings.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>No training records match your filters.</div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Topic & Type</th>
                    <th>Trainer</th>
                    <th>Status</th>
                    <th>Rating</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrainings.map((tr) => {
                    const empName = tr.employeeId ? `${tr.employeeId.firstName} ${tr.employeeId.lastName}` : 'Unknown';
                    const trainerName = tr.assignedTrainerId ? `${tr.assignedTrainerId.firstName} ${tr.assignedTrainerId.lastName}` : 'Unknown';
                    const badge = STATUS_BADGE[tr.status] || STATUS_BADGE.Assigned;

                    return (
                      <tr key={tr._id}>
                        <td>
                          <strong>{empName}</strong>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tr.employeeId?.role}</div>
                        </td>
                        <td>
                          <strong>{tr.topic}</strong>
                          <div style={{ fontSize: 11, color: tr.type === 'Technical' ? '#818CF8' : '#6EE7B7' }}>
                            {tr.type === 'Technical' ? '⚙ Technical' : '📋 HR / General'}
                          </div>
                          {tr.scheduledDate && (
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                              📅 {new Date(tr.scheduledDate).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: 13 }}>{trainerName}</td>
                        <td>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 700,
                            background: `${badge.bg}22`,
                            color: badge.bg,
                            border: `1px solid ${badge.bg}44`,
                          }}>
                            {badge.label}
                          </span>
                        </td>
                        <td>
                          {tr.performanceRating ? (
                            <StarRatingDisplay value={tr.performanceRating} />
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: 11, padding: '4px 10px' }}
                            onClick={() => {
                              setSelectedTraining(tr);
                              setReportStatus(tr.status);
                              setReportText(tr.report || '');
                              setReportStars(tr.performanceRating || 0);
                            }}
                          >
                            Follow Up
                          </button>
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

      {/* Follow-up Modal */}
      {selectedTraining && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.72)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 20,
          }}
          onClick={() => setSelectedTraining(null)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 14,
              padding: 32,
              maxWidth: 520,
              width: '100%',
              boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Training Follow-Up & Report</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
              <strong>{selectedTraining.topic}</strong> ·{' '}
              {selectedTraining.employeeId?.firstName} {selectedTraining.employeeId?.lastName}
            </p>

            <form onSubmit={handleUpdateReport} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Training Status</label>
                <select className="form-input" value={reportStatus} onChange={(e) => setReportStatus(e.target.value)}>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ marginBottom: 8 }}>Performance Rating</label>
                <StarRatingInput value={reportStars} onChange={setReportStars} />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  {reportStars === 0 ? 'No rating' : reportStars === 1 ? '⚠ Poor' : reportStars === 2 ? '📉 Below Average' : reportStars === 3 ? '✅ Satisfactory' : reportStars === 4 ? '👍 Good' : '🌟 Exceptional'}
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Trainer Report / Notes</label>
                <textarea className="form-input" rows={4} value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  placeholder="Document training outcomes, observations, and recommendations…" />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedTraining(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingPage;
