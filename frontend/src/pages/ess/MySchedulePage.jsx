import { useState, useEffect, useRef } from 'react';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useAux } from '../../context/AuxContext';

const fmtMins = (mins) => {
  if (!mins) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const fmtDuration = (ms) => {
  if (!ms || ms < 0) return '0m 0s';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
};

const STATUS_COLORS = {
  Live: '#10B981', Training: '#F59E0B', Break: '#6366F1',
  Coaching: '#3B82F6', 'Logged out': '#EF4444',
};
const STATUS_ICONS = {
  Live: '🟢', Training: '🟡', Break: '🟣', Coaching: '🔵', 'Logged out': '🔴',
};

const MySchedulePage = () => {
  const { user } = useAuth();
  const { currentAux, statusSince, todayStats, myPlan } = useAux();
  const tick = useRef(0);
  const [, force] = useState(0);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = setInterval(() => { tick.current += 1; force(t => t + 1); }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true);
      try {
        const { data } = await API.get(`/ess/schedule?month=${month}`);
        const d = data.data || {};
        setSchedules(d.schedules || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, [month]);

  const profile = user;
  const weeklyOffDays = profile?.weeklyOffDays || [];
  const activeMs = currentAux !== 'Logged out' && statusSince ? Date.now() - new Date(statusSince).getTime() : 0;

  const current = schedules.find(s => s.month === month) || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Schedule</h1>
          <p className="page-subtitle">Your personal work schedule, shift and live presence</p>
        </div>
        <input
          type="month"
          className="form-input"
          value={month}
          onChange={e => setMonth(e.target.value)}
          style={{ width: 'auto', padding: '8px 12px', fontSize: 13 }}
        />
      </div>

      {/* Current live status */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px',
            borderRadius: 20, fontSize: 13, fontWeight: 700,
            color: STATUS_COLORS[currentAux], background: `${STATUS_COLORS[currentAux]}15`,
            border: `1px solid ${STATUS_COLORS[currentAux]}40`,
          }}>
            {STATUS_ICONS[currentAux]} {currentAux}
          </span>
          {currentAux !== 'Logged out' && (
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              for {fmtDuration(activeMs)}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          🕐 {profile?.shift || 'N/A'}
          {weeklyOffDays.length > 0 && ` · Off: ${weeklyOffDays.join(', ')}`}
        </div>
      </div>

      {/* Today's AUX summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        {['Live', 'Break', 'Training', 'Coaching'].map(s => (
          <div key={s} className="card" style={{ textAlign: 'center', padding: '14px 10px' }}>
            <div style={{ fontWeight: 700, fontSize: 18, color: STATUS_COLORS[s] }}>{fmtMins(todayStats?.[s] || 0)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{s}</div>
          </div>
        ))}
      </div>

      {/* Schedule detail for the month */}
      {loading ? (
        <div className="loading-state"><div className="spinner" /> Loading schedule…</div>
      ) : !current ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 48 }}>
          No schedule published for {month}.
        </div>
      ) : (
        <div className="card">
          <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>Monthly Plan · {current.month}</h3>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 16 }}>
            {[
              { l: 'Live', v: current.monthlyPlan?.liveMinutes },
              { l: 'Break', v: current.monthlyPlan?.breakMinutes },
              { l: 'Training', v: current.monthlyPlan?.trainingMinutes },
              { l: 'Coaching', v: current.monthlyPlan?.coachingMinutes },
            ].map(({ l, v }) => (
              <div key={l} style={{ flex: 1, minWidth: 120, background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l} (planned)</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: STATUS_COLORS[l] }}>{fmtMins(v || 0)}</div>
              </div>
            ))}
          </div>

          {current.weeklyOverrides?.length > 0 && (
            <>
              <h4 style={{ margin: '0 0 10px', fontSize: 13 }}>Weekly Overrides</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {current.weeklyOverrides.map((w, i) => (
                  <div key={i} style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, minWidth: 90 }}>{w.weekLabel}</div>
                    <span style={{ fontSize: 12, color: STATUS_COLORS.Live }}>Live {fmtMins(w.liveMinutes)}</span>
                    <span style={{ fontSize: 12, color: STATUS_COLORS.Break }}>Break {fmtMins(w.breakMinutes)}</span>
                    <span style={{ fontSize: 12, color: STATUS_COLORS.Training }}>Training {fmtMins(w.trainingMinutes)}</span>
                    <span style={{ fontSize: 12, color: STATUS_COLORS.Coaching }}>Coaching {fmtMins(w.coachingMinutes)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MySchedulePage;
