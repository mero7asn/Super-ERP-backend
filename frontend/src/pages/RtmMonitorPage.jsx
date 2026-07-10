import { useState, useEffect, useRef, useCallback } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AUX_COLORS, AUX_ICONS } from '../context/AuxContext';

const REFRESH_INTERVAL = 20000; // 20s live refresh

const RTM_ROLES = ['RTM Team Member', 'Super CRM Administrator', 'HRM System Administrator', 'HR Manager'];

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

const RtmMonitorPage = () => {
  const { user } = useAuth();
  const tick = useLiveTick();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [unflagging, setUnflagging] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('All');
  const [groupByTeam, setGroupByTeam] = useState(true);
  const intervalRef = useRef(null);

  const isRTM = RTM_ROLES.includes(user?.role);

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

  useEffect(() => {
    fetchAgents();
    intervalRef.current = setInterval(() => fetchAgents(true), REFRESH_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [fetchAgents]);

  const handleUnflag = async (agentId) => {
    setUnflagging(agentId);
    try {
      await API.put('/hrm/aux/rtm-flag', { employeeId: agentId, rtmFlagged: false });
      // Hold automatic re-flagging for 15 minutes
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

  // Filter + sort: flagged always first, then by live duration desc
  const now = Date.now();
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
      // Flagged always on top
      if (a.rtmFlagged && !b.rtmFlagged) return -1;
      if (!a.rtmFlagged && b.rtmFlagged) return 1;
      // Then by live duration descending
      const aLive = a.auxStatus === 'Live' && a.activeStatusSince ? now - new Date(a.activeStatusSince).getTime() : 0;
      const bLive = b.auxStatus === 'Live' && b.activeStatusSince ? now - new Date(b.activeStatusSince).getTime() : 0;
      return bLive - aLive;
    });

  // Distinct teams for the team filter dropdown
  const teams = Array.from(
    new Set(agents.map(a => a.team || 'Unassigned'))
  ).sort();

  const counts = {
    All: agents.length,
    Live: agents.filter(a => a.auxStatus === 'Live').length,
    Break: agents.filter(a => a.auxStatus === 'Break').length,
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

        {/* Summary stat pills */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { key: 'All', label: 'All Agents', color: '#64748B' },
            { key: 'Live', label: 'Live', color: AUX_COLORS.Live },
            { key: 'Break', label: 'Break', color: AUX_COLORS.Break },
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
            // Group by team when enabled, else a single flat group
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
                  const liveMs = agent.auxStatus === 'Live' && agent.activeStatusSince
                    ? now - new Date(agent.activeStatusSince).getTime()
                    : 0;
                  const currentMs = agent.activeStatusSince
                    ? now - new Date(agent.activeStatusSince).getTime()
                    : 0;
                  const isFlagged = agent.rtmFlagged;
                  const outOfShift = agent.auxStatus === 'Live' && agent.withinShift === false;

                  return (
                    <div
                      key={agent._id}
                      className={isFlagged ? 'card rtm-flagged-row' : 'card'}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 16,
                        padding: '14px 20px', transition: 'all 0.2s',
                        borderLeft: isFlagged ? '4px solid #EF4444' : outOfShift ? '4px solid #F59E0B' : '4px solid transparent',
                      }}
                    >
                      {/* Avatar */}
                      <Avatar person={agent} size={40} />

                      {/* Name + role */}
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
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {agent.role}{agent.department ? ` · ${agent.department}` : ''}
                        </div>
                      </div>

                      {/* Current status */}
                      <div style={{ flex: '0 0 130px' }}>
                        <StatusPill status={agent.auxStatus} />
                      </div>

                      {/* Time in current status */}
                      <div style={{ flex: '0 0 120px' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Current status for</div>
                        <div style={{
                          fontWeight: 700, fontSize: 13,
                          color: isFlagged ? '#EF4444' : agent.auxStatus === 'Live' ? AUX_COLORS.Live : 'var(--text-primary)',
                        }}>
                          {agent.activeStatusSince ? fmtDuration(currentMs) : '—'}
                        </div>
                      </div>

                      {/* Today's AUX breakdown */}
                      <div style={{ flex: 1, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {['Live', 'Break', 'Training', 'Coaching'].map(s => (
                          <div key={s} style={{
                            textAlign: 'center', padding: '4px 10px', borderRadius: 8,
                            background: `${AUX_COLORS[s]}11`, border: `1px solid ${AUX_COLORS[s]}33`,
                            minWidth: 64,
                          }}>
                            <div style={{ fontWeight: 700, fontSize: 12, color: AUX_COLORS[s] }}>
                              {fmtMins(agent.todayStats?.[s] || 0)}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s}</div>
                          </div>
                        ))}
                      </div>

                      {/* Shift */}
                      <div style={{ flex: '0 0 160px', fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
                        <div>🕐 {agent.shift || 'N/A'}{agent.isOffDay ? ' · Off day' : ''}</div>
                        {isFlagged && agent.rtmFlaggedAt && (
                          <div style={{ color: '#EF4444', marginTop: 3 }}>
                            Flagged at {new Date(agent.rtmFlaggedAt).toLocaleTimeString()}
                          </div>
                        )}
                      </div>

                      {/* Unflag button / suppression hold */}
                      {isFlagged ? (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleUnflag(agent._id)}
                          disabled={unflagging === agent._id}
                          style={{ flexShrink: 0, padding: '6px 14px', fontSize: 12 }}
                        >
                          {unflagging === agent._id ? '…' : '✓ Unflag'}
                        </button>
                      ) : agent.rtmSuppressUntil && agent.rtmSuppressUntil > now ? (
                        <div style={{
                          flexShrink: 0, padding: '6px 12px', fontSize: 11, fontWeight: 700,
                          borderRadius: 20, color: '#B45309',
                          background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)',
                          textAlign: 'center',
                        }}>
                          Hold · {Math.max(1, Math.ceil((agent.rtmSuppressUntil - now) / 60000))}m
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ));
          })()
        )}
      </div>
    </>
  );
};

export default RtmMonitorPage;
