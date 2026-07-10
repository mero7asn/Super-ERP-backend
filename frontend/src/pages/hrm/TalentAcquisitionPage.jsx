import { useState, useEffect, useMemo } from 'react';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DEPARTMENTS } from '../../services/departmentJobs';

// --- Kanban Pipeline Column ---

const PIPELINE_STAGES = ['Applied', 'Screening', 'Interview', 'Offered', 'Hired', 'Rejected'];

const STAGE_COLORS = {
  Applied: { bg: 'rgba(107,114,128,0.15)', border: '#6B7280', text: '#9CA3AF' },
  Screening: { bg: 'rgba(99,102,241,0.12)', border: '#6366F1', text: '#818CF8' },
  Interview: { bg: 'rgba(245,158,11,0.12)', border: '#F59E0B', text: '#FCD34D' },
  Offered: { bg: 'rgba(59,130,246,0.12)', border: '#3B82F6', text: '#60A5FA' },
  Hired: { bg: 'rgba(16,185,129,0.12)', border: '#10B981', text: '#6EE7B7' },
  Rejected: { bg: 'rgba(239,68,68,0.1)', border: '#EF4444', text: '#FCA5A5' },
};

const CandidateCard = ({ candidate, isTA, onMove, onOpenFeedback }) => {
  const [dragging, setDragging] = useState(false);
  const lastNote = candidate.interviewerNotes?.[candidate.interviewerNotes.length - 1];

  return (
    <div
      draggable={isTA}
      onDragStart={(e) => { setDragging(true); e.dataTransfer.setData('candidateId', candidate._id); }}
      onDragEnd={() => setDragging(false)}
      style={{
        padding: '12px 14px',
        borderRadius: 8,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid var(--border-color)',
        cursor: isTA ? 'grab' : 'default',
        opacity: dragging ? 0.5 : 1,
        transition: 'opacity 0.2s, transform 0.2s, box-shadow 0.2s',
        boxShadow: dragging ? '0 6px 20px rgba(0,0,0,0.3)' : 'none',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{candidate.fullName}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
        {candidate.vacancyId?.title || 'Unknown Position'}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>✉ {candidate.email}</div>
      {candidate.phone && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>📞 {candidate.phone}</div>}
      {lastNote && (
        <div
          style={{
            marginTop: 8,
            padding: '6px 8px',
            borderRadius: 5,
            background: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.2)',
            fontSize: 11,
            color: '#A5B4FC',
            lineHeight: 1.4,
          }}
        >
          💬 {lastNote.note.length > 80 ? lastNote.note.slice(0, 80) + '…' : lastNote.note}
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
            — {lastNote.addedBy?.firstName} {lastNote.addedBy?.lastName}
          </div>
        </div>
      )}
      {isTA && (
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <button
            className="btn btn-secondary btn-sm"
            style={{ fontSize: 10, padding: '3px 8px', flex: 1 }}
            onClick={() => onOpenFeedback(candidate)}
          >
            + Note
          </button>
        </div>
      )}
    </div>
  );
};

const KanbanColumn = ({ stage, candidates, isTA, onDrop, onMove, onOpenFeedback }) => {
  const colors = STAGE_COLORS[stage];
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      style={{
        flex: '1 1 160px',
        minWidth: 170,
        maxWidth: 240,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { setDragOver(false); const id = e.dataTransfer.getData('candidateId'); if (id) onDrop(id, stage); }}
    >
      {/* Column Header */}
      <div
        style={{
          padding: '8px 12px',
          borderRadius: 8,
          background: colors.bg,
          border: `1px solid ${colors.border}44`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 12, color: colors.text }}>{stage}</span>
        <span
          style={{
            fontWeight: 700,
            fontSize: 12,
            minWidth: 22,
            height: 22,
            borderRadius: '50%',
            background: `${colors.border}33`,
            color: colors.text,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {candidates.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        style={{
          minHeight: 100,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: '6px',
          borderRadius: 8,
          border: dragOver ? `2px dashed ${colors.border}` : '2px dashed transparent',
          transition: 'border 0.2s',
          background: dragOver ? `${colors.bg}` : 'transparent',
        }}
      >
        {candidates.map((c) => (
          <CandidateCard
            key={c._id}
            candidate={c}
            isTA={isTA}
            onMove={onMove}
            onOpenFeedback={onOpenFeedback}
          />
        ))}
        {candidates.length === 0 && !dragOver && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, padding: '16px 0', opacity: 0.5 }}>
            Drop here
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main Component ---

const TalentAcquisitionPage = () => {
  const { user } = useAuth();
  const [vacancies, setVacancies] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // View mode: 'kanban' | 'table'
  const [viewMode, setViewMode] = useState('kanban');
  const [filterVacancy, setFilterVacancy] = useState('All');
  const [filterDept, setFilterDept] = useState('All');

  // Forms
  const [showVacancyForm, setShowVacancyForm] = useState(false);
  const [showCandForm, setShowCandForm] = useState(false);
  const [vacancyTitle, setVacancyTitle] = useState('');
  const [vacancyDesc, setVacancyDesc] = useState('');
  const [vacancyReq, setVacancyReq] = useState('');
  const [vacancySalary, setVacancySalary] = useState('');
  const [vacancyDept, setVacancyDept] = useState('Sales');
  const [vacancyRole, setVacancyRole] = useState('Sales Agent');
  const [selectedVacancyId, setSelectedVacancyId] = useState('');
  const [candName, setCandName] = useState('');
  const [candEmail, setCandEmail] = useState('');
  const [candPhone, setCandPhone] = useState('');
  const [candResume, setCandResume] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Feedback modal
  const [feedbackCandidate, setFeedbackCandidate] = useState(null);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [savingFeedback, setSavingFeedback] = useState(false);

  const isTA = ['HRM System Administrator', 'HR Manager', 'Recruitment Specialist (Talent Acquisition)', 'Super CRM Administrator'].includes(user?.role);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [vacRes, candRes] = await Promise.all([
        API.get('/hrm/vacancies'),
        API.get('/hrm/candidates'),
      ]);
      setVacancies(vacRes.data?.data || []);
      setCandidates(candRes.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreateVacancy = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.post('/hrm/vacancies', {
        title: vacancyTitle, description: vacancyDesc,
        requirements: vacancyReq, salaryRange: vacancySalary,
        department: vacancyDept, jobRole: vacancyRole,
      });
      setStatusMsg({ type: 'success', text: `Job vacancy "${vacancyTitle}" posted.` });
      setVacancyTitle(''); setVacancyDesc(''); setVacancyReq(''); setVacancySalary('');
      setVacancyDept('Sales'); setVacancyRole('Sales Agent');
      setShowVacancyForm(false);
      fetchAll();
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to create vacancy.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCandidate = async (e) => {
    e.preventDefault();
    if (!selectedVacancyId || !candName || !candEmail) return;
    setSubmitting(true);
    try {
      await API.post('/hrm/candidates', {
        vacancyId: selectedVacancyId,
        fullName: candName, email: candEmail,
        phone: candPhone, resumeUrl: candResume || 'pending',
      });
      setStatusMsg({ type: 'success', text: `Candidate "${candName}" added to pipeline.` });
      setCandName(''); setCandEmail(''); setCandPhone(''); setCandResume('');
      setShowCandForm(false);
      fetchAll();
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to add candidate.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveCandidate = async (candId, newStage) => {
    try {
      await API.put(`/hrm/candidates/${candId}/status`, { status: newStage });
      // Optimistic update
      setCandidates((prev) => prev.map((c) => c._id === candId ? { ...c, status: newStage } : c));
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to move candidate.' });
    }
  };

  const handleAddFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackNote.trim() || !feedbackCandidate) return;
    setSavingFeedback(true);
    try {
      await API.post(`/hrm/candidates/${feedbackCandidate._id}/notes`, { note: feedbackNote });
      setStatusMsg({ type: 'success', text: 'Interviewer note saved.' });
      setFeedbackNote('');
      setFeedbackCandidate(null);
      fetchAll();
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to save feedback note.' });
    } finally {
      setSavingFeedback(false);
    }
  };

  // Pipeline stats
  const pipelineStats = useMemo(() => {
    return PIPELINE_STAGES.reduce((acc, stage) => {
      acc[stage] = candidates.filter((c) => c.status === stage).length;
      return acc;
    }, {});
  }, [candidates]);

  // Filtered candidates for kanban / table
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const vacancyMatch = filterVacancy === 'All' || c.vacancyId?._id === filterVacancy || c.vacancyId === filterVacancy;
      const deptMatch = filterDept === 'All' || (() => {
        const v = vacancies.find(v => v._id === (c.vacancyId?._id || c.vacancyId));
        return v?.department === filterDept;
      })();
      return vacancyMatch && deptMatch;
    });
  }, [candidates, filterVacancy, filterDept, vacancies]);

  const columnCandidates = (stage) => filteredCandidates.filter((c) => c.status === stage);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Talent Acquisition</h1>
          <p className="page-subtitle">
            Manage job openings, track candidate pipelines, and log interviewer feedback notes
          </p>
        </div>
        {isTA && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowVacancyForm((v) => !v)}>
              {showVacancyForm ? '✕ Close' : '+ Post Vacancy'}
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCandForm((v) => !v)}>
              {showCandForm ? '✕ Close' : '+ Add Candidate'}
            </button>
          </div>
        )}
      </div>

      {statusMsg.text && (
        <div className={`alert alert-${statusMsg.type === 'error' ? 'error' : 'success'}`}>
          {statusMsg.text}
        </div>
      )}

      {/* Collapsible Forms */}
      {isTA && showVacancyForm && (
        <div className="card">
          <h3 style={{ margin: '0 0 16px 0', fontSize: 15 }}>Post New Job Vacancy</h3>
          <form onSubmit={handleCreateVacancy} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Department *</label>
              <select
                className="form-input"
                value={vacancyDept}
                onChange={e => {
                  const dept = e.target.value;
                  setVacancyDept(dept);
                  setVacancyRole(DEPARTMENTS.find(d => d.id === dept)?.roles[0] || '');
                }}
              >
                {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Job Role *</label>
              <select className="form-input" value={vacancyRole} onChange={e => setVacancyRole(e.target.value)}>
                {(DEPARTMENTS.find(d => d.id === vacancyDept)?.roles || []).map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Job Title *</label>
              <input className="form-input" value={vacancyTitle} onChange={(e) => setVacancyTitle(e.target.value)} required />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Salary Range</label>
              <input className="form-input" placeholder="e.g. 15,000 – 20,000 EGP" value={vacancySalary} onChange={(e) => setVacancySalary(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0, gridColumn: '1/-1' }}>
              <label className="form-label">Job Description *</label>
              <textarea className="form-input" rows={2} value={vacancyDesc} onChange={(e) => setVacancyDesc(e.target.value)} required />
            </div>
            <div className="form-group" style={{ margin: 0, gridColumn: '1/-1' }}>
              <label className="form-label">Requirements</label>
              <input className="form-input" placeholder="e.g. 3+ years, Node.js, CRM experience" value={vacancyReq} onChange={(e) => setVacancyReq(e.target.value)} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>{submitting ? 'Posting…' : 'Post Job'}</button>
            </div>
          </form>
        </div>
      )}

      {isTA && showCandForm && (
        <div className="card">
          <h3 style={{ margin: '0 0 16px 0', fontSize: 15 }}>Add Candidate to Pipeline</h3>
          <form onSubmit={handleCreateCandidate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div className="form-group" style={{ margin: 0, gridColumn: '1/-1' }}>
              <label className="form-label">Job Vacancy *</label>
              <select className="form-input" value={selectedVacancyId} onChange={(e) => setSelectedVacancyId(e.target.value)} required>
                <option value="">Select vacancy…</option>
                {vacancies.map((v) => <option key={v._id} value={v._id}>{v.title}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Full Name *</label>
              <input className="form-input" value={candName} onChange={(e) => setCandName(e.target.value)} required />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Email *</label>
              <input className="form-input" type="email" value={candEmail} onChange={(e) => setCandEmail(e.target.value)} required />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Phone</label>
              <input className="form-input" value={candPhone} onChange={(e) => setCandPhone(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Resume / File Name</label>
              <input className="form-input" placeholder="CV_JohnDoe.pdf" value={candResume} onChange={(e) => setCandResume(e.target.value)} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>{submitting ? 'Adding…' : 'Add Candidate'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Pipeline Stats Bar */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {PIPELINE_STAGES.map((stage) => {
          const colors = STAGE_COLORS[stage];
          return (
            <div
              key={stage}
              style={{
                flex: '1 1 100px',
                padding: '10px 14px',
                borderRadius: 8,
                background: colors.bg,
                border: `1px solid ${colors.border}44`,
                textAlign: 'center',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 22, color: colors.text }}>{pipelineStats[stage] || 0}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{stage}</div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setViewMode('kanban')}
            className={`btn ${viewMode === 'kanban' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            style={{ fontSize: 12 }}
          >
            ⬡ Kanban Board
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            style={{ fontSize: 12 }}
          >
            ≡ Table View
          </button>
        </div>
        <select
          className="form-input"
          style={{ flex: '0 1 180px', padding: '6px 10px', fontSize: 12 }}
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
        >
          <option value="All">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
        <select
          className="form-input"
          style={{ flex: '0 1 220px', padding: '6px 10px', fontSize: 12 }}
          value={filterVacancy}
          onChange={(e) => setFilterVacancy(e.target.value)}
        >
          <option value="All">All Vacancies</option>
          {vacancies.map((v) => <option key={v._id} value={v._id}>{v.title}</option>)}
        </select>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filteredCandidates.length} candidates</span>
      </div>

      {/* Kanban Board */}
      {viewMode === 'kanban' && (
        <div
          style={{
            display: 'flex',
            gap: 12,
            overflowX: 'auto',
            paddingBottom: 12,
          }}
        >
          {PIPELINE_STAGES.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              candidates={columnCandidates(stage)}
              isTA={isTA}
              onDrop={handleMoveCandidate}
              onMove={handleMoveCandidate}
              onOpenFeedback={setFeedbackCandidate}
            />
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="card">
          {loading ? (
            <div className="loading-state">Loading candidates…</div>
          ) : filteredCandidates.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>No candidates found.</div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Applied For</th>
                    <th>Contact</th>
                    <th>Stage</th>
                    <th>Latest Feedback</th>
                    {isTA && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((c) => {
                    const colors = STAGE_COLORS[c.status] || STAGE_COLORS.Applied;
                    const lastNote = c.interviewerNotes?.[c.interviewerNotes.length - 1];
                    return (
                      <tr key={c._id}>
                        <td><strong>{c.fullName}</strong></td>
                        <td style={{ fontSize: 13 }}>{c.vacancyId?.title || '—'}</td>
                        <td>
                          <div style={{ fontSize: 13 }}>{c.email}</div>
                          {c.phone && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.phone}</div>}
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-block', padding: '3px 10px', borderRadius: 12,
                            fontSize: 11, fontWeight: 700,
                            background: `${colors.border}22`, color: colors.text,
                            border: `1px solid ${colors.border}44`,
                          }}>
                            {c.status}
                          </span>
                        </td>
                        <td style={{ maxWidth: 200 }}>
                          {lastNote ? (
                            <div style={{ fontSize: 11, color: '#A5B4FC' }}>
                              {lastNote.note.slice(0, 70)}{lastNote.note.length > 70 ? '…' : ''}
                            </div>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No notes yet</span>
                          )}
                        </td>
                        {isTA && (
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: 11, padding: '3px 10px' }}
                                onClick={() => setFeedbackCandidate(c)}
                              >
                                + Note
                              </button>
                              <select
                                className="form-input"
                                style={{ padding: '3px 6px', fontSize: 11, height: 'auto', width: 'auto' }}
                                value={c.status}
                                onChange={(e) => handleMoveCandidate(c._id, e.target.value)}
                              >
                                {PIPELINE_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
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

      {/* Feedback Notes Modal */}
      {feedbackCandidate && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
          onClick={() => setFeedbackCandidate(null)}
        >
          <div
            style={{ background: 'var(--bg-card)', borderRadius: 14, padding: 32, maxWidth: 540, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Interviewer Feedback</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              <strong>{feedbackCandidate.fullName}</strong> · {feedbackCandidate.vacancyId?.title || 'Unknown Position'} ·{' '}
              <span style={{ color: STAGE_COLORS[feedbackCandidate.status]?.text }}>
                {feedbackCandidate.status}
              </span>
            </p>

            {/* Previous Notes Timeline */}
            {feedbackCandidate.interviewerNotes?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h5 style={{ margin: '0 0 10px 0', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                  Previous Notes ({feedbackCandidate.interviewerNotes.length})
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                  {[...feedbackCandidate.interviewerNotes].reverse().map((n, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 6,
                        background: 'rgba(99,102,241,0.08)',
                        border: '1px solid rgba(99,102,241,0.18)',
                        fontSize: 12,
                      }}
                    >
                      <div style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}>{n.note}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                        {n.addedBy?.firstName} {n.addedBy?.lastName} · {n.addedAt ? new Date(n.addedAt).toLocaleDateString() : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Note */}
            <form onSubmit={handleAddFeedback} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Add Interviewer Note</label>
                <textarea
                  className="form-input"
                  rows={4}
                  value={feedbackNote}
                  onChange={(e) => setFeedbackNote(e.target.value)}
                  placeholder="Document interview observations, strengths, concerns, or follow-up actions…"
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFeedbackCandidate(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={savingFeedback}>
                  {savingFeedback ? 'Saving…' : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TalentAcquisitionPage;
