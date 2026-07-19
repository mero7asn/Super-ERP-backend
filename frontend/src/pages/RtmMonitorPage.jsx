import { useState, useEffect, useRef, useCallback } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AUX_COLORS, AUX_ICONS } from '../context/AuxContext';

const REFRESH_INTERVAL = 20000; // 20s live refresh

const RTM_ROLES = ['RTM Team Member', 'Super CRM Administrator', 'HRM System Administrator', 'HR Manager'];

const SHIFT_OPTIONS = [
  'Day Shift (09:00 - 17:00)',
  'Afternoon Shift (15:00 - 23:00)',
  'Night Shift (17:00 - 01:00)',
  'Morning Shift (06:00 - 14:00)',
  'Split Shift (09:00 - 13:00, 17:00 - 21:00)',
  'Flexible Hours',
];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Live elapsed timer — ticks every second
const useLiveTick = () => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return tick;
};

const fmtDuration = (ms) => {
  if (!ms || ms < 0) return '0m 0s';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
};

const fmtMins = (mins) => {
  if (!mins) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const StatusPill = ({ status }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
    background: `${AUX_COLORS[status] || '#888'}22`,
    color: AUX_COLORS[status] || '#888',
    border: `1px solid ${AUX_COLORS[status] || '#888'}44`,
  }}>
    {AUX_ICONS[status]} {status}
  </span>
);

const FlagBadge = ({ reason }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800,
    background: 'rgba(239,68,68,0.15)', color: '#EF4444',
    border: '1px solid rgba(239,68,68,0.4)',
    animation: 'rtm-pulse 1.4s ease-in-out infinite',
  }}>
    🚨 FLAGGED{reason ? ` · ${reason}` : ''}
  </span>
);

const Avatar = ({ person, size = 36 }) => {
  const initials = person
    ? `${person.firstName?.[0] || ''}${person.lastName?.[0] || ''}`.toUpperCase()
    : '?';
  const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'];
  const color = colors[(initials.charCodeAt(0) || 0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.36, color: '#fff', flexShrink: 0,
    }}>
      {initials}
    </div>
  );
};

const TabBtn = ({ id, label, active, onClick }) => (
  <button
    onClick={() => onClick(id)}
    style={{
      padding: '10px 22px', border: 'none', background: 'transparent', cursor: 'pointer',
      borderBottom: active ? '2px solid var(--accent-secondary)' : '2px solid transparent',
      color: active ? 'var(--accent-secondary)' : 'var(--text-muted)',
      fontWeight: active ? 700 : 400, fontSize: 13, marginBottom: -1,
    }}
  >
    {label}
  </button>
);

const RtmMonitorPage = () => {
  const { user } = useAuth();
  const tick = useLiveTick();
  const now = Date.now();

  // ─── Live Monitor state ───
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [unflagging, setUnflagging] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('All');
  const [groupByTeam, setGroupByTeam] = useState(true);
  const intervalRef = useRef(null);

  // ─── Schedule Editor state ───
  const [employees, setEmployees] = useState([]);
  const [schedEditEmpId, setSchedEditEmpId] = useState('');
  const [schedEditMonth, setSchedEditMonth] = useState(new Date().toISOString().slice(0, 7));
  const [detailedSchedule, setDetailedSchedule] = useState(null);
  const [schedShift, setSchedShift] = useState('Day Shift (09:00 - 17:00)');
  const [schedOffDays, setSchedOffDays] = useState(['Friday', 'Saturday']);
  const [schedSaving, setSchedSaving] = useState(false);
  const [schedMsg, setSchedMsg] = useState({ type: '', text: '' });

  // Weekly override editor
  const [selectedWeek, setSelectedWeek] = useState('Week 1');
  const [weekShift, setWeekShift] = useState('Day Shift (09:00 - 17:00)');
  const [weekOffDays, setWeekOffDays] = useState([]);

  // Daily override editor
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyShift, setDailyShift] = useState('Day Shift (09:00 - 17:00)');
  const [dailyIsOff, setDailyIsOff] = useState(false);

  // ─── Change Logs state ───
  const [changeLogs, setChangeLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logEmpFilter, setLogEmpFilter] = useState('');
  const [logSourceFilter, setLogSourceFilter] = useState('All');

  // ─── Tab ───
  const [tab, setTab] = useState('monitor');

  const isRTM = RTM_ROLES.includes(user?.role);

  // ── Fetch helpers ──
  const fetchAgents = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await API.get('/hrm/aux/team');
      setAgents(data.data || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const { data } = await API.get('/auth/users-list');
      setEmployees(data.data || []);
    } catch { /* silent */ }
  }, []);

  const fetchSchedule = useCallback(async () => {
    if (!schedEditEmpId || !schedEditMonth) return;
    try {
      const { data } = await API.get(`/hrm/schedules/detailed?employeeId=${schedEditEmpId}&month=${schedEditMonth}`);
      if (data.success && data.data) {
        const s = data.data;
        setDetailedSchedule(s);
        setSchedShift(s.defaultShift || 'Day Shift (09:00 - 17:00)');
        setSchedOffDays(s.defaultOffDays || ['Friday', 'Saturday']);
        const w = (s.weeklyOverrides || {})[selectedWeek] || {};
        setWeekShift(w.shift || s.defaultShift || 'Day Shift (09:00 - 17:00)');
        setWeekOffDays(w.weeklyOffDays || s.defaultOffDays || []);
        const d = (s.dailyOverrides || {})[selectedDate] || {};
        setDailyShift(d.shift || s.defaultShift || 'Day Shift (09:00 - 17:00)');
        setDailyIsOff(d.isOffDay || false);
      }
    } catch { /* silent */ }
  }, [schedEditEmpId, schedEditMonth, selectedWeek, selectedDate]);

  const fetchChangeLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const q = logEmpFilter ? `&employeeId=${logEmpFilter}` : '';
      const s = logSourceFilter !== 'All' ? `&changeSource=${logSourceFilter}` : '';
      const { data } = await API.get(`/hrm/schedules/change-logs?${q}${s}`);
      if (data.success) setChangeLogs(data.data || []);
    } catch { /* silent */ }
    finally { setLogsLoading(false); }
  }, [logEmpFilter, logSourceFilter]);

  useEffect(() => {
    if (!isRTM) return;
    fetchAgents();
    fetchEmployees();
    intervalRef.current = setInterval(() => fetchAgents(true), REFRESH_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [fetchAgents, fetchEmployees, isRTM]);

  useEffect(() => {
    if (tab === 'schedule') fetchSchedule();
  }, [tab, schedEditEmpId, schedEditMonth, fetchSchedule]);

  useEffect(() => {
    if (tab === 'logs') fetchChangeLogs();
  }, [tab, logEmpFilter, logSourceFilter, fetchChangeLogs]);

  // ── Schedule saving helpers ──
  const saveMonthlyBase = async (e) => {
    e.preventDefault();
    setSchedSaving(true);
    setSchedMsg({ type: '', text: '' });
    try {
      await API.put('/hrm/schedules/detailed', {
        employeeId: schedEditEmpId,
        month: schedEditMonth,
        defaultShift: schedShift,
        defaultOffDays: schedOffDays,
        changeSource: 'RTM',
      });
      setSchedMsg({ type: 'success', text: 'Monthly base schedule updated.' });
      fetchSchedule();
    } catch (err) {
      setSchedMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save.' });
    } finally { setSchedSaving(false); }
  };

  const saveWeeklyOverride = async (e) => {
    e.preventDefault();
    if (!detailedSchedule) return;
    setSchedSaving(true);
    try {
      const updatedOverrides = {
        ...(detailedSchedule.weeklyOverrides || {}),
        [selectedWeek]: { shift: weekShift, weeklyOffDays: weekOffDays },
      };
      await API.put('/hrm/schedules/detailed', {
        employeeId: schedEditEmpId,
        month: schedEditMonth,
        weeklyOverrides: updatedOverrides,
        changeSource: 'RTM',
      });
      setSchedMsg({ type: 'success', text: `Weekly override for ${selectedWeek} saved.` });
      fetchSchedule();
    } catch (err) {
      setSchedMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save.' });
    } finally { setSchedSaving(false); }
  };

  const saveDailyOverride = async (e) => {
    e.preventDefault();
    if (!detailedSchedule) return;
    setSchedSaving(true);
    try {
      const updatedOverrides = {
        ...(detailedSchedule.dailyOverrides || {}),
        [selectedDate]: { shift: dailyShift, isOffDay: dailyIsOff },
      };
      await API.put('/hrm/schedules/detailed', {
        employeeId: schedEditEmpId,
        month: schedEditMonth,
        dailyOverrides: updatedOverrides,
        changeSource: 'RTM',
      });
      setSchedMsg({ type: 'success', text: `Daily override for ${selectedDate} saved.` });
      fetchSchedule();
    } catch (err) {
      setSchedMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save.' });
    } finally { setSchedSaving(false); }
  };

  const handleUnflag = async (agentId) => {
    setUnflagging(agentId);
    try {
      await API.put('/hrm/aux/rtm-flag', { employeeId: agentId, rtmFlagged: false });
      const suppressUntil = Date.now() + 15 * 60 * 1000;
      setAgents(prev => prev.map(a => a._id === agentId
        ? { ...a, rtmFlagged: false, rtmFlaggedAt: null, rtmFlagReason: null, rtmSuppressUntil: suppressUntil }
        : a));
    } catch (err) {
      console.error(err);
    } finally {
      setUnflagging(null);
    }
  };

  // ── Monitor derived data ──
  const filtered = agents
    .filter(a => {
      if (teamFilter !== 'All' && (a.team || 'Unassigned') !== teamFilter) return false;
      if (filterStatus !== 'All' && a.auxStatus !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          `${a.firstName} ${a.lastName}`.toLowerCase().includes(q) ||
          (a.role || '').toLowerCase().includes(q) ||
          (a.department || '').toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (a.rtmFlagged && !b.rtmFlagged) return -1;
      if (!a.rtmFlagged && b.rtmFlagged) return 1;
      const aLive = a.auxStatus === 'Live' && a.activeStatusSince ? now - new Date(a.activeStatusSince).getTime() : 0;
      const bLive = b.auxStatus === 'Live' && b.activeStatusSince ? now - new Date(b.activeStatusSince).getTime() : 0;
      return bLive - aLive;
    });

  const teams = Array.from(new Set(agents.map(a => a.team || 'Unassigned'))).sort();

  const counts = {
    All: agents.length,
    Live: agents.filter(a => a.auxStatus === 'Live').length,
    Break: agents.filter(a => a.auxStatus === 'Break').length,
    Lunch: agents.filter(a => a.auxStatus === 'Lunch').length,
    Training: agents.filter(a => a.auxStatus === 'Training').length,
    Coaching: agents.filter(a => a.auxStatus === 'Coaching').length,
    'Logged out': agents.filter(a => a.auxStatus === 'Logged out').length,
    Flagged: agents.filter(a => a.rtmFlagged).length,
  };

  if (!isRTM) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, flexDirection: 'column', gap: 12 }}>
        <span style={{ fontSize: 40 }}>🚫</span>
        <span style={{ color: 'var(--text-muted)' }}>Access restricted to RTM Team Members.</span>
      </div>
    );
  }

  return (
    <>
      {/* Pulse animation for flagged rows */}
      <style>{`
        @keyframes rtm-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        @keyframes rtm-row-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
          50% { box-shadow: 0 0 0 3px rgba(239,68,68,0.25); }
        }
        .rtm-flagged-row {
          animation: rtm-row-glow 2s ease-in-out infinite;
          border-left: 4px solid #EF4444 !important;
          background: rgba(239,68,68,0.04) !important;
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header */}
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 className="page-title">🎯 RTM Live Monitor</h1>
              <p className="page-subtitle">
                Real-time agent status · auto-refreshes every 20s
                {lastRefresh && (
                  <span style={{ marginLeft: 10, color: 'var(--text-muted)', fontSize: 12 }}>
                    · Last updated: {lastRefresh.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
            <button className="btn btn-secondary" onClick={() => fetchAgents()} style={{ padding: '8px 16px', fontSize: 12 }}>
              ↻ Refresh Now
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-color)' }}>
          <TabBtn id="monitor" label="📡 Live Monitor" active={tab === 'monitor'} onClick={setTab} />
          <TabBtn id="schedule" label="📅 Schedule Editor" active={tab === 'schedule'} onClick={setTab} />
          <TabBtn id="logs" label="📋 Change Logs" active={tab === 'logs'} onClick={setTab} />
        </div>

        {/* ─────────── TAB: LIVE MONITOR ─────────── */}
        {tab === 'monitor' && (
          <>
            {/* Summary stat pills */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { key: 'All', label: 'All Agents', color: '#64748B' },
                { key: 'Live', label: 'Live', color: AUX_COLORS.Live },
                { key: 'Break', label: 'Break', color: AUX_COLORS.Break },
                { key: 'Lunch', label: 'Lunch', color: AUX_COLORS.Lunch || '#F97316' },
                { key: 'Training', label: 'Training', color: AUX_COLORS.Training },
                { key: 'Coaching', label: 'Coaching', color: AUX_COLORS.Coaching },
                { key: 'Logged out', label: 'Logged Out', color: AUX_COLORS['Logged out'] },
                { key: 'Flagged', label: '🚨 Flagged', color: '#EF4444' },
              ].map(({ key, label, color }) => (
                <button
                  key={key}
                  onClick={() => setFilterStatus(key === 'Flagged' ? 'All' : key)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, border: `1px solid ${color}44`,
                    background: filterStatus === key ? `${color}22` : 'transparent',
                    color, fontWeight: 700, fontSize: 12, cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  {label} <span style={{ opacity: 0.8 }}>({counts[key]})</span>
                </button>
              ))}
            </div>

            {/* Search */}
            <input
              className="form-input"
              placeholder="🔍 Search by name, role, department…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ maxWidth: 360, padding: '8px 14px', fontSize: 13 }}
            />

            {/* Team controls */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                className="form-input"
                value={teamFilter}
                onChange={e => setTeamFilter(e.target.value)}
                style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }}
              >
                <option value="All">All Teams</option>
                {teams.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button
                onClick={() => setGroupByTeam(g => !g)}
                className={groupByTeam ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                style={{ fontSize: 12, padding: '6px 14px' }}
              >
                {groupByTeam ? '👥 Grouped by Team' : '👥 Group by Team'}
              </button>
            </div>

            {/* Agent cards */}
            {loading ? (
              <div className="loading-state">
                <div className="spinner" />
                Loading agents…
              </div>
            ) : filtered.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 60 }}>
                No agents match the current filter.
              </div>
            ) : (
              (() => {
                const groups = groupByTeam
                  ? teams
                      .filter(t => (teamFilter === 'All' ? true : t === teamFilter))
                      .map(t => ({ name: t, members: filtered.filter(a => (a.team || 'Unassigned') === t) }))
                      .filter(g => g.members.length > 0)
                  : [{ name: null, members: filtered }];

                return groups.map(group => (
                  <div key={group.name || 'all'} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {group.name && (
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 14px', borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13 }}>
                          👥 {group.name}
                          <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 12 }}>
                            · {group.members.length} {group.members.length === 1 ? 'agent' : 'agents'}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          🚨 {group.members.filter(m => m.rtmFlagged).length} flagged
                        </div>
                      </div>
                    )}

                    {group.members.map(agent => {
                      const currentMs = agent.activeStatusSince
                        ? now - new Date(agent.activeStatusSince).getTime()
                        : 0;
                      const isFlagged = agent.rtmFlagged;
                      const outOfShift = agent.auxStatus === 'Live' && agent.withinShift === false;
                      const onOffDay = agent.isOffDay;

                      return (
                        <div
                          key={agent._id}
                          className={isFlagged ? 'card rtm-flagged-row' : 'card'}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 16,
                            padding: '14px 20px', transition: 'all 0.2s',
                            borderLeft: isFlagged ? '4px solid #EF4444' : outOfShift || onOffDay ? '4px solid #F59E0B' : '4px solid transparent',
                          }}
                        >
                          <Avatar person={agent} size={40} />

                          <div style={{ flex: '0 0 200px', minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              {agent.firstName} {agent.lastName}
                              {isFlagged && <FlagBadge reason={agent.rtmFlagReason} />}
                              {outOfShift && !isFlagged && (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 3,
                                  padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                                  background: 'rgba(245,158,11,0.15)', color: '#B45309',
                                  border: '1px solid rgba(245,158,11,0.4)',
                                }}>
                                  ⏰ OFF-SHIFT
                                </span>
                              )}
                              {onOffDay && agent.auxStatus === 'Live' && !isFlagged && (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 3,
                                  padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                                  background: 'rgba(239,68,68,0.12)', color: '#EF4444',
                                  border: '1px solid rgba(239,68,68,0.35)',
                                }}>
                                  📅 OFF-DAY
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                              {agent.role}{agent.department ? ` · ${agent.department}` : ''}
                            </div>
                          </div>

                          <div style={{ flex: '0 0 130px' }}>
                            <StatusPill status={agent.auxStatus} />
                          </div>

                          <div style={{ flex: '0 0 120px' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Current status for</div>
                            <div style={{
                              fontWeight: 700, fontSize: 13,
                              color: isFlagged ? '#EF4444' : agent.auxStatus === 'Live' ? AUX_COLORS.Live : 'var(--text-primary)',
                            }}>
                              {agent.activeStatusSince ? fmtDuration(currentMs) : '—'}
                            </div>
                          </div>

                          <div style={{ flex: 1, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            {['Live', 'Break', 'Lunch', 'Training', 'Coaching'].map(s => (
                              <div key={s} style={{
                                textAlign: 'center', padding: '4px 10px', borderRadius: 8,
                                background: `${AUX_COLORS[s] || '#64748B'}11`, border: `1px solid ${AUX_COLORS[s] || '#64748B'}33`,
                                minWidth: 56,
                              }}>
                                <div style={{ fontWeight: 700, fontSize: 12, color: AUX_COLORS[s] || '#64748B' }}>
                                  {fmtMins(agent.todayStats?.[s] || 0)}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s}</div>
                              </div>
                            ))}
                          </div>

                          <div style={{ flex: '0 0 160px', fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
                            <div>🕐 {agent.shift || 'N/A'}{agent.isOffDay ? ' · Off day' : ''}</div>
                            {isFlagged && agent.rtmFlaggedAt && (
                              <div style={{ color: '#EF4444', marginTop: 3 }}>
                                Flagged at {new Date(agent.rtmFlaggedAt).toLocaleTimeString()}
                              </div>
                            )}
                          </div>

                          {/* Quick reschedule button + Unflag */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setSchedEditEmpId(agent._id);
                                setSchedEditMonth(new Date().toISOString().slice(0, 7));
                                setTab('schedule');
                              }}
                              style={{ fontSize: 11, padding: '5px 10px' }}
                            >
                              📅 Reschedule
                            </button>

                            {isFlagged ? (
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleUnflag(agent._id)}
                                disabled={unflagging === agent._id}
                                style={{ padding: '5px 10px', fontSize: 11 }}
                              >
                                {unflagging === agent._id ? '…' : '✓ Unflag'}
                              </button>
                            ) : agent.rtmSuppressUntil && agent.rtmSuppressUntil > now ? (
                              <div style={{
                                padding: '5px 10px', fontSize: 10, fontWeight: 700,
                                borderRadius: 20, color: '#B45309',
                                background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)',
                                textAlign: 'center',
                              }}>
                                Hold · {Math.max(1, Math.ceil((agent.rtmSuppressUntil - now) / 60000))}m
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ));
              })()
            )}
          </>
        )}

        {/* ─────────── TAB: SCHEDULE EDITOR ─────────── */}
        {tab === 'schedule' && (
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* Employee selector */}
            <div className="card" style={{ flex: '0 0 230px', display: 'flex', flexDirection: 'column', gap: 6, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>SELECT EMPLOYEE</div>
              {employees.map(emp => (
                <button
                  key={emp._id}
                  onClick={() => setSchedEditEmpId(emp._id)}
                  style={{
                    textAlign: 'left', padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: schedEditEmpId === emp._id ? 'rgba(37,99,235,0.12)' : 'rgba(255,255,255,0.02)',
                    borderLeft: schedEditEmpId === emp._id ? '3px solid var(--accent-secondary)' : '3px solid transparent',
                    color: 'var(--text-primary)', fontSize: 13,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{emp.firstName} {emp.lastName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.role}</div>
                </button>
              ))}
            </div>

            {/* Edit area */}
            <div style={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {!schedEditEmpId ? (
                <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                  Select an employee to edit their schedule.
                </div>
              ) : (
                <>
                  {schedMsg.text && (
                    <div className={`alert alert-${schedMsg.type === 'error' ? 'error' : 'success'}`}>{schedMsg.text}</div>
                  )}

                  {/* Month selector */}
                  <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Target Month</label>
                    <input
                      type="month"
                      className="form-input"
                      value={schedEditMonth}
                      onChange={e => setSchedEditMonth(e.target.value)}
                      style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }}
                    />
                  </div>

                  {/* 1. Monthly base */}
                  <div className="card">
                    <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>1. Monthly Base Schedule</h3>
                    <form onSubmit={saveMonthlyBase} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Default Shift</label>
                        <select className="form-input" value={schedShift} onChange={e => setSchedShift(e.target.value)}>
                          {SHIFT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Weekly Off Days</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {DAYS.map(d => (
                            <label key={d} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={schedOffDays.includes(d)}
                                onChange={e => setSchedOffDays(prev =>
                                  e.target.checked ? [...prev, d] : prev.filter(x => x !== d)
                                )}
                              />
                              {d.slice(0, 3)}
                            </label>
                          ))}
                        </div>
                      </div>
                      <button type="submit" className="btn btn-primary" disabled={schedSaving} style={{ width: 'auto', padding: '8px 24px', fontSize: 13 }}>
                        {schedSaving ? 'Saving…' : '💾 Save Monthly Base'}
                      </button>
                    </form>
                  </div>

                  {/* 2. Weekly override */}
                  <div className="card">
                    <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>2. Weekly Override</h3>
                    <form onSubmit={saveWeeklyOverride} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Week</label>
                        <select className="form-input" value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)} style={{ width: 'auto' }}>
                          {['Week 1','Week 2','Week 3','Week 4','Week 5'].map(w => <option key={w} value={w}>{w}</option>)}
                        </select>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Shift for this week</label>
                        <select className="form-input" value={weekShift} onChange={e => setWeekShift(e.target.value)}>
                          {SHIFT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Off Days for this week</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {DAYS.map(d => (
                            <label key={d} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={weekOffDays.includes(d)}
                                onChange={e => setWeekOffDays(prev =>
                                  e.target.checked ? [...prev, d] : prev.filter(x => x !== d)
                                )}
                              />
                              {d.slice(0, 3)}
                            </label>
                          ))}
                        </div>
                      </div>
                      <button type="submit" className="btn btn-primary" disabled={schedSaving} style={{ width: 'auto', padding: '8px 24px', fontSize: 13 }}>
                        {schedSaving ? 'Saving…' : '💾 Save Weekly Override'}
                      </button>
                    </form>
                  </div>

                  {/* 3. Daily override */}
                  <div className="card">
                    <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>3. Daily Override</h3>
                    <form onSubmit={saveDailyOverride} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Date</label>
                        <input
                          type="date"
                          className="form-input"
                          value={selectedDate}
                          onChange={e => setSelectedDate(e.target.value)}
                          style={{ width: 'auto' }}
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Shift for this day</label>
                        <select className="form-input" value={dailyShift} onChange={e => setDailyShift(e.target.value)}>
                          {SHIFT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input
                          type="checkbox"
                          id="rtm-daily-off"
                          checked={dailyIsOff}
                          onChange={e => setDailyIsOff(e.target.checked)}
                          style={{ width: 16, height: 16 }}
                        />
                        <label htmlFor="rtm-daily-off" style={{ fontSize: 13, cursor: 'pointer' }}>Mark as Off Day</label>
                      </div>
                      <button type="submit" className="btn btn-primary" disabled={schedSaving} style={{ width: 'auto', padding: '8px 24px', fontSize: 13 }}>
                        {schedSaving ? 'Saving…' : '💾 Save Daily Override'}
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ─────────── TAB: CHANGE LOGS ─────────── */}
        {tab === 'logs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Filters */}
            <div className="card" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', padding: 16 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Filter by Employee</label>
                <select
                  className="form-input"
                  value={logEmpFilter}
                  onChange={e => setLogEmpFilter(e.target.value)}
                  style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }}
                >
                  <option value="">All Employees</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Filter by Source</label>
                <select
                  className="form-input"
                  value={logSourceFilter}
                  onChange={e => setLogSourceFilter(e.target.value)}
                  style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }}
                >
                  <option value="All">All Sources</option>
                  <option value="RTM">🟠 RTM</option>
                  <option value="HR">🔵 HR</option>
                  <option value="Personal">🟢 Personal</option>
                </select>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={fetchChangeLogs} style={{ fontSize: 12, marginTop: 16 }}>
                🔄 Refresh
              </button>
            </div>

            {logsLoading ? (
              <div className="loading-state"><div className="spinner" />Loading logs…</div>
            ) : changeLogs.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                No schedule change logs found for the selected filters.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {changeLogs.map((log, i) => {
                  const sourceColor = log.changeSource === 'RTM' ? '#F97316' : log.changeSource === 'HR' ? '#3B82F6' : '#10B981';
                  const sourceLabel = log.changeSource === 'RTM' ? '🟠 RTM' : log.changeSource === 'HR' ? '🔵 HR' : '🟢 Personal';
                  return (
                    <div key={log._id || i} className="card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start', padding: '12px 16px' }}>
                      <span style={{
                        fontSize: 11, background: `${sourceColor}18`, color: sourceColor,
                        border: `1px solid ${sourceColor}44`, borderRadius: 4, padding: '2px 8px',
                        fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0,
                      }}>
                        {sourceLabel}
                      </span>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>
                          {log.employeeId ? `${log.employeeId.firstName} ${log.employeeId.lastName}` : '—'}
                          <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11 }}> · {log.employeeId?.role}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          Changed by <strong style={{ color: 'var(--text-primary)' }}>
                            {log.changedBy ? `${log.changedBy.firstName} ${log.changedBy.lastName}` : '—'}
                          </strong>
                          <span style={{ color: 'var(--text-muted)' }}> ({log.changedByRole})</span>
                          {' · '}field: <strong style={{ color: 'var(--text-primary)' }}>{log.field}</strong>
                          {' · '}month: {log.month}
                          {log.note ? <> · <em>"{log.note}"</em></> : ''}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </>
  );
};

export default RtmMonitorPage;
