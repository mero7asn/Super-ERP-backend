import { useState, useRef, useEffect } from 'react';
import { useAux, AUX_COLORS, AUX_ICONS } from '../context/AuxContext';
import { useAuth } from '../context/AuthContext';

const STATUSES = ['Live', 'Training', 'Coaching', 'Break', 'Logged out'];

const fmtSecs = (secs) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const fmtMins = (mins) => {
  if (!mins && mins !== 0) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const AuxTopBar = () => {
  const { user } = useAuth();
  const { currentAux, statusSince, todayStats, myPlan, changeAux } = useAux();
  const [elapsed, setElapsed] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Tick every second for the live timer
  useEffect(() => {
    setElapsed(Math.floor((Date.now() - statusSince) / 1000));
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [statusSince]);

  useEffect(() => { setElapsed(0); }, [currentAux]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) return null;

  const color = AUX_COLORS[currentAux] || '#6B7280';

  // Today's totals: server accumulated + current live session minutes
  const todayFor = (status) =>
    (todayStats?.[status] || 0) + (currentAux === status ? Math.floor(elapsed / 60) : 0);

  const statItems = [
    { key: 'Live',     planned: myPlan?.liveMinutes },
    { key: 'Training', planned: myPlan?.trainingMinutes },
    { key: 'Coaching', planned: myPlan?.coachingMinutes },
    { key: 'Break',    planned: myPlan?.breakMinutes },
  ];

  return (
    <div style={{
      position: 'fixed', top: 0, left: 'var(--sidebar-width, 240px)', right: 0,
      height: 48, background: 'var(--bg-card)',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', zIndex: 900, gap: 16,
    }}>

      {/* Today's time totals vs plan */}
      <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
        {statItems.map(({ key, planned }) => {
          const today = todayFor(key);
          const pct = planned ? Math.round((today / planned) * 100) : null;
          const c = AUX_COLORS[key];
          const onTrack = pct === null || pct >= 80;
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{key}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: c }}>{fmtMins(today)}</span>
              {planned > 0 && (
                <span style={{
                  fontSize: 10, padding: '1px 6px', borderRadius: 8, fontWeight: 600,
                  background: onTrack ? `${c}18` : '#EF444418',
                  color: onTrack ? c : '#EF4444',
                  border: `1px solid ${onTrack ? c : '#EF4444'}33`,
                }}>
                  {pct}% / {fmtMins(planned)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Current status pill + live ticking timer + dropdown */}
      <div ref={ref} style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 14px', borderRadius: 20,
            background: `${color}18`, border: `1px solid ${color}55`,
            color, fontWeight: 700, fontSize: 13, cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, display: 'inline-block' }} />
          {AUX_ICONS[currentAux]} {currentAux}
          <span style={{
            fontFamily: 'monospace', fontSize: 13, fontWeight: 700,
            background: `${color}22`, padding: '1px 8px', borderRadius: 6,
            letterSpacing: '0.05em',
          }}>
            {fmtSecs(elapsed)}
          </span>
          <span style={{ fontSize: 10, opacity: 0.7 }}>▾</span>
        </button>

        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0,
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: 10, overflow: 'hidden', minWidth: 180,
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)', zIndex: 1000,
          }}>
            {STATUSES.map(s => {
              const c = AUX_COLORS[s];
              const active = currentAux === s;
              return (
                <button
                  key={s}
                  onClick={() => { changeAux(s); setOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '10px 16px', border: 'none',
                    background: active ? `${c}18` : 'transparent',
                    color: active ? c : 'var(--text-primary)',
                    fontWeight: active ? 700 : 400, fontSize: 13,
                    cursor: 'pointer', textAlign: 'left',
                    borderLeft: active ? `3px solid ${c}` : '3px solid transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: c, flexShrink: 0 }} />
                  {AUX_ICONS[s]} {s}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuxTopBar;
