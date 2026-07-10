import { useState, useEffect, useMemo } from 'react';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { AUX_COLORS } from '../../context/AuxContext';

const fmt = (mins) => {
  if (mins === null || mins === undefined) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const ComplianceBar = ({ actual, planned, color }) => {
  if (!planned) return <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No target</span>;
  const pct = Math.min(Math.round((actual / planned) * 100), 150);
  const over = pct > 100;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden', minWidth: 80 }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: over ? '#10B981' : pct >= 80 ? color : '#EF4444', borderRadius: 4, transition: 'width 0.5s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: over ? '#10B981' : pct >= 80 ? color : '#EF4444', minWidth: 36 }}>{pct}%</span>
    </div>
  );
};

// Generate week labels for a given month string "YYYY-MM"
const getWeeksOfMonth = (month) => {
  const [y, m] = month.split('-').map(Number);
  const weeks = [];
  const d = new Date(y, m - 1, 1);
  let wNum = 1;
  while (d.getMonth() === m - 1) {
    const weekStart = new Date(d);
    const weekEnd = new Date(d);
    weekEnd.setDate(weekEnd.getDate() + 6);
    if (weekEnd.getMonth() !== m - 1) weekEnd.setDate(new Date(y, m, 0).getDate());
    weeks.push({
      weekLabel: `Week ${wNum} (${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${weekEnd.toLocaleDateString('en-US', { day: 'numeric' })})`,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
    });
    d.setDate(d.getDate() + 7 - d.getDay() + 1 > d.getDate() ? 7 : 7);
    wNum++;
    if (wNum > 6) break;
  }
  return weeks;
};

const AuxSchedulePage = () => {
  const { user } = useAuth();
  const isHR = ['HRM System Administrator', 'HR Manager', 'Super CRM Administrator', 'Attendance and Time Officer', 'HR Director / Executive HR User'].includes(user?.role);
  const isRTM = user?.role === 'RTM Team Member';
  const canManageSchedules = isHR; // only HR can edit schedules

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [tab, setTab] = useState('report'); // 'report' | 'schedule'
  const [month, setMonth] = useState(defaultMonth);
  const [employees, setEmployees] = useState([]);
  const [report, setReport] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // Schedule editor state
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [monthlyPlan, setMonthlyPlan] = useState({ liveMinutes: 480, breakMinutes: 60, trainingMinutes: 0, coachingMinutes: 0 });
  const [weeklyOverrides, setWeeklyOverrides] = useState([]);
  const [saving, setSaving] = useState(false);

  const weeks = useMemo(() => getWeeksOfMonth(month), [month]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [empRes, reportRes, schedRes] = await Promise.all([
        API.get('/auth/users-list'),
        API.get(`/hrm/aux/report?from=${month}-01&to=${month}-31`),
        API.get(`/hrm/aux/schedule?month=${month}`),
      ]);
      setEmployees(empRes.data?.data || []);
      setReport(reportRes.data?.data || []);
      setSchedules(schedRes.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [month]);

  // When employee selected for schedule editing, load existing schedule
  useEffect(() => {
    if (!selectedEmpId) return;
    const existing = schedules.find(s => (s.userId?._id || s.userId) === selectedEmpId);
    if (existing) {
      setMonthlyPlan(existing.monthlyPlan || { liveMinutes: 480, breakMinutes: 60, trainingMinutes: 0, coachingMinutes: 0 });
      setWeeklyOverrides(existing.weeklyOverrides || []);
    } else {
      setMonthlyPlan({ liveMinutes: 480, breakMinutes: 60, trainingMinutes: 0, coachingMinutes: 0 });
      setWeeklyOverrides([]);
    }
  }, [selectedEmpId, schedules]);

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!selectedEmpId) return;
    setSaving(true);
    try {
      await API.post('/hrm/aux/schedule', {
        userId: selectedEmpId,
        month,
        monthlyPlan,
        weeklyOverrides,
      });
      setStatusMsg({ type: 'success', text: 'Schedule saved successfully.' });
      fetchAll();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save schedule.' });
    } finally {
      setSaving(false);
    }
  };

  const updateWeekOverride = (weekLabel, field, value) => {
    setWeeklyOverrides(prev => {
      const existing = prev.find(w => w.weekLabel === weekLabel);
      if (existing) {
        return prev.map(w => w.weekLabel === weekLabel ? { ...w, [field]: Number(value) } : w);
      }
      const weekDef = weeks.find(w => w.weekLabel === weekLabel);
      return [...prev, { ...weekDef, [field]: Number(value) }];
    });
  };

  const getWeekOverride = (weekLabel, field) => {
    const w = weeklyOverrides.find(w => w.weekLabel === weekLabel);
    return w?.[field] ?? '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">AUX Schedule & Compliance</h1>
          <p className="page-subtitle">Monitor AUX time vs planned schedule — monthly targets with weekly overrides</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Month:</label>
          <input
            type="month"
            className="form-input"
            value={month}
            onChange={e => setMonth(e.target.value)}
            style={{ padding: '6px 10px', fontSize: 13, width: 160 }}
          />
        </div>
      </div>

      {statusMsg.text && (
        <div className={`alert alert-${statusMsg.type === 'error' ? 'error' : 'success'}`}>{statusMsg.text}</div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-color)' }}>
        {[
          { id: 'report', label: '📊 Compliance Report' },
          ...(isHR ? [{ id: 'schedule', label: '📅 Schedule Editor' }] : []),
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 20px', border: 'none', background: 'transparent', cursor: 'pointer',
            borderBottom: tab === t.id ? '2px solid var(--accent-secondary)' : '2px solid transparent',
            color: tab === t.id ? 'var(--accent-secondary)' : 'var(--text-muted)',
            fontWeight: tab === t.id ? 700 : 400, fontSize: 13, marginBottom: -1,
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── REPORT TAB ── */}
      {tab === 'report' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {loading ? (
            <div className="loading-state">Loading report…</div>
          ) : report.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
              No AUX activity recorded for {month}. Make sure employees are logging their status.
            </div>
          ) : (
            report.map(entry => {
              const name = `${entry.user?.firstName} ${entry.user?.lastName}`;
              const totalActive = (entry.totals?.Live || 0) + (entry.totals?.Break || 0) + (entry.totals?.Training || 0);
              return (
                <div key={entry.user?._id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{entry.user?.role} · {entry.workDays} working days</div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {['Live', 'Coaching', 'Break', 'Training', 'Logged out'].map(s => (
                        <div key={s} style={{ textAlign: 'center', padding: '6px 12px', borderRadius: 8,
                          background: `${AUX_COLORS[s]}12`, border: `1px solid ${AUX_COLORS[s]}33` }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: AUX_COLORS[s] }}>{fmt(entry.totals?.[s])}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Compliance bars */}
                  {entry.planned?.liveMinutes && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                      {[
                        { label: 'Live Time',     actual: entry.totals?.Live,     planned: entry.planned?.liveMinutes,     color: AUX_COLORS.Live },
                        { label: 'Coaching Time', actual: entry.totals?.Coaching, planned: entry.planned?.coachingMinutes, color: AUX_COLORS.Coaching },
                        { label: 'Break Time',    actual: entry.totals?.Break,    planned: entry.planned?.breakMinutes,    color: AUX_COLORS.Break },
                        { label: 'Training Time', actual: entry.totals?.Training, planned: entry.planned?.trainingMinutes, color: AUX_COLORS.Training },
                      ].map(item => (
                        <div key={item.label} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.label}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmt(item.actual)} / {fmt(item.planned)}</span>
                          </div>
                          <ComplianceBar actual={item.actual || 0} planned={item.planned} color={item.color} />
                        </div>
                      ))}
                    </div>
                  )}

                  {!entry.planned?.liveMinutes && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      ⚠ No schedule set for this employee in {month}. Set one in the Schedule Editor.
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── SCHEDULE EDITOR TAB ── */}
      {tab === 'schedule' && isHR && (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Employee selector */}
          <div className="card" style={{ flex: '0 0 260px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>Select Employee</h3>
            <div style={{ maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {employees.map(emp => {
                const hasSched = schedules.some(s => (s.userId?._id || s.userId) === emp._id);
                return (
                  <div key={emp._id} onClick={() => setSelectedEmpId(emp._id)} style={{
                    padding: '10px 14px', borderRadius: 6, cursor: 'pointer',
                    background: selectedEmpId === emp._id ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.03)',
                    borderLeft: selectedEmpId === emp._id ? '3px solid var(--accent-secondary)' : '3px solid transparent',
                  }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{emp.firstName} {emp.lastName}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{emp.role}</div>
                    {hasSched && <div style={{ fontSize: 10, color: '#10B981', marginTop: 2 }}>✓ Schedule set</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Schedule form */}
          {selectedEmpId && (
            <div className="card" style={{ flex: '1 1 480px' }}>
              <h3 style={{ margin: '0 0 18px 0', fontSize: 14 }}>
                Monthly Schedule — {employees.find(e => e._id === selectedEmpId)?.firstName} · {month}
              </h3>
              <form onSubmit={handleSaveSchedule} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Monthly base plan */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                    Monthly Base Plan (minutes per working day)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    {[
                      { key: 'liveMinutes',     label: 'Live (min/day)',     color: AUX_COLORS.Live },
                      { key: 'coachingMinutes', label: 'Coaching (min/day)', color: AUX_COLORS.Coaching },
                      { key: 'breakMinutes',    label: 'Break (min/day)',    color: AUX_COLORS.Break },
                      { key: 'trainingMinutes', label: 'Training (min/day)', color: AUX_COLORS.Training },
                    ].map(f => (
                      <div key={f.key} className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ color: f.color }}>{f.label}</label>
                        <input
                          className="form-input"
                          type="number"
                          min={0}
                          value={monthlyPlan[f.key]}
                          onChange={e => setMonthlyPlan(p => ({ ...p, [f.key]: Number(e.target.value) }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weekly overrides */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                    Weekly Overrides (leave blank to use monthly base)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {weeks.map(w => (
                      <div key={w.weekLabel} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: 'var(--text-secondary)' }}>{w.weekLabel}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                          {[
                            { key: 'liveMinutes',     label: 'Live',     color: AUX_COLORS.Live },
                            { key: 'coachingMinutes', label: 'Coaching', color: AUX_COLORS.Coaching },
                            { key: 'breakMinutes',    label: 'Break',    color: AUX_COLORS.Break },
                            { key: 'trainingMinutes', label: 'Training', color: AUX_COLORS.Training },
                          ].map(f => (
                            <div key={f.key} className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: 11, color: f.color }}>{f.label} (min/day)</label>
                              <input
                                className="form-input"
                                type="number"
                                min={0}
                                placeholder={monthlyPlan[f.key]}
                                value={getWeekOverride(w.weekLabel, f.key)}
                                onChange={e => updateWeekOverride(w.weekLabel, f.key, e.target.value)}
                                style={{ fontSize: 12 }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Schedule'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuxSchedulePage;
