import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import API from '../services/api';
import { Icon } from '../components/Icons';

// ── Colour tokens ──────────────────────────────────────────────
const C = {
  blue:   '#4f6ef7',
  cyan:   '#06b6d4',
  green:  '#22c55e',
  yellow: '#f59e0b',
  red:    '#ef4444',
  purple: '#a855f7',
};

// ── Custom tooltip ─────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 13,
    }}>
      {label && <div style={{ color: 'var(--text-muted)', marginBottom: 6, fontSize: 11 }}>{label}</div>}
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
};

// ── Section heading ────────────────────────────────────────────
const SectionHeading = ({ children }) => (
  <h2 style={{
    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.1em',
    marginBottom: 16, marginTop: 32,
  }}>{children}</h2>
);

// ── Stat card ─────────────────────────────────────────────────
const KpiCard = ({ icon, value, label, color, delta }) => (
  <div className={`stat-card ${color}`}>
    <div className="stat-icon" style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
      <Icon name={icon} size={24} />
    </div>
    <div className="stat-value">{value}</div>
    <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {label}
      {delta !== undefined && (
        <span style={{ fontSize: 11, color: delta >= 0 ? C.green : C.red, fontWeight: 700 }}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%
        </span>
      )}
    </div>
  </div>
);

const PIE_COLORS = [C.blue, C.cyan, C.yellow, C.purple, C.green];

// Helper functions to process API data
const processLeadTrend = (data) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthMap = {};
  
  data.forEach(item => {
    const monthKey = months[item._id.month - 1];
    if (!monthMap[monthKey]) monthMap[monthKey] = { month: monthKey, Meta: 0, Google: 0, Email: 0, Other: 0, Converted: 0 };
    
    if (item._id.status === 'Converted') {
      monthMap[monthKey].Converted += item.count;
    } else {
      const platform = item._id.platform || 'Other';
      if (monthMap[monthKey][platform] !== undefined) {
        monthMap[monthKey][platform] += item.count;
      } else {
        monthMap[monthKey].Other += item.count;
      }
    }
  });
  
  return Object.values(monthMap).slice(-6);
};

const processTicketTrend = (data) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthMap = {};
  
  data.forEach(item => {
    const monthKey = months[item._id.month - 1];
    if (!monthMap[monthKey]) monthMap[monthKey] = { month: monthKey, Open: 0, Resolved: 0 };
    
    if (item._id.status === 'Open') {
      monthMap[monthKey].Open += item.count;
    } else if (item._id.status === 'Resolved') {
      monthMap[monthKey].Resolved += item.count;
    }
  });
  
  return Object.values(monthMap).slice(-6);
};

const processRoleDistribution = (data) => {
  const roleMap = {
    'Sales Agent': 'Sales',
    'Sales Manager': 'Sales',
    'Customer Support Agent': 'Support',
    'Customer Support Manager': 'Support',
    'Marketing Specialist': 'Marketing',
    'Marketing Manager': 'Marketing',
    'Business Analyst': 'Analyst',
    'CRM Consultant': 'Consultant',
    'CRM Developer': 'Developer',
    'System Architect': 'Admin',
    'Super CRM Administrator': 'Admin',
    'Executive User': 'Executive'
  };
  
  const grouped = {};
  data.forEach(item => {
    const category = roleMap[item._id] || 'Other';
    grouped[category] = (grouped[category] || 0) + item.count;
  });
  
  return Object.entries(grouped).map(([name, value]) => ({ name, value }));
};

// ── Main page ─────────────────────────────────────────────────
const ExecutiveDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    API.get('/analytics')
      .then(({ data }) => {
        console.log('📊 Analytics Response:', JSON.stringify(data.data, null, 2));
        setStats(data.data);
      })
      .catch(err => setError(err.response?.data?.message || 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  // Process lead trends
  const leadTrend = stats?.leadsByPlatform ? processLeadTrend(stats.leadsByPlatform) : [];
  
  if (stats) {
    console.log('📈 Chart Data:', { 
      leadTrendLength: leadTrend.length, 
      hasLeadsByPlatform: !!stats.leadsByPlatform,
      leadsByPlatformLength: stats.leadsByPlatform?.length || 0
    });
  }
  const ticketTrend = stats?.ticketsByMonth ? processTicketTrend(stats.ticketsByMonth) : [];
  const roleData = stats?.roleDistribution ? processRoleDistribution(stats.roleDistribution) : [];

  const convRate = stats && stats.leads.total > 0
    ? ((stats.leads.converted / stats.leads.total) * 100).toFixed(1)
    : '0.0';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icon name="executive" size={26} style={{ color: 'var(--accent-primary)' }} />
          Executive Dashboard
        </h1>
        <p className="page-subtitle">
          Real-time KPIs, lead pipeline performance, and team activity
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-state"><div className="spinner" />Loading analytics…</div>
      ) : (
        <>
          {/* ── KPI Row ── */}
          <SectionHeading>Key Performance Indicators</SectionHeading>
          <div className="stat-grid">
            <KpiCard icon="target" value={stats?.leads.total ?? '–'}     label="Total Leads"       color="blue"   delta={stats?.leads.deltas?.total} />
            <KpiCard icon="plus" value={stats?.leads.new ?? '–'}       label="New This Period"   color="cyan"   delta={stats?.leads.deltas?.new}  />
            <KpiCard icon="check" value={stats?.leads.converted ?? '–'} label="Converted"         color="green"  delta={stats?.leads.deltas?.converted}  />
            <KpiCard icon="trending" value={`${convRate}%`}                label="Conversion Rate"   color="yellow" />
            <KpiCard icon="ticket" value={stats?.tickets.total ?? '–'}   label="Total Tickets"     color="blue"   delta={stats?.tickets.deltas?.total} />
            <KpiCard icon="unlock" value={stats?.tickets.open ?? '–'}    label="Open Tickets"      color="red"    delta={stats?.tickets.deltas?.open} />
            <KpiCard icon="megaphone" value={stats?.campaigns.total ?? '–'} label="Total Campaigns"   color="cyan"   />
            <KpiCard icon="play" value={stats?.campaigns.active ?? '–'} label="Active Campaigns" color="green"  />
          </div>

          {/* ── Lead Platform Trend ── */}
          <SectionHeading>Lead Pipeline — Marketing Platforms Performance</SectionHeading>
          <div className="card" style={{ marginBottom: 20 }}>
            {leadTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={leadTrend} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gMeta" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.blue}  stopOpacity={0.25} />
                      <stop offset="95%" stopColor={C.blue}  stopOpacity={0}    />
                    </linearGradient>
                    <linearGradient id="gGoogle" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.cyan}  stopOpacity={0.25} />
                      <stop offset="95%" stopColor={C.cyan}  stopOpacity={0}    />
                    </linearGradient>
                    <linearGradient id="gEmail" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.purple}  stopOpacity={0.25} />
                      <stop offset="95%" stopColor={C.purple}  stopOpacity={0}    />
                    </linearGradient>
                    <linearGradient id="gOther" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.yellow}  stopOpacity={0.25} />
                      <stop offset="95%" stopColor={C.yellow}  stopOpacity={0}    />
                    </linearGradient>
                    <linearGradient id="gConv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.green} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={C.green} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                  <Area type="monotone" dataKey="Meta" stroke={C.blue} fill="url(#gMeta)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="Google" stroke={C.cyan} fill="url(#gGoogle)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="Email" stroke={C.purple} fill="url(#gEmail)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="Other" stroke={C.yellow} fill="url(#gOther)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="Converted" stroke={C.green} fill="url(#gConv)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No platform lead data available</div>
            )}
          </div>

          {/* ── Bottom row: ticket bar + role pie ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Ticket Resolution Bar */}
            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="ticket" size={18} style={{ color: 'var(--accent-primary)' }} />
                Ticket Resolution Trend
              </h3>
              {ticketTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={ticketTrend} margin={{ top: 0, right: 8, left: -20, bottom: 0 }} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                    <Bar dataKey="Open"     fill={C.red}   radius={[4,4,0,0]} />
                    <Bar dataKey="Resolved" fill={C.green} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No ticket data available</div>
              )}
            </div>

            {/* Team Role Distribution Pie */}
            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="users" size={18} style={{ color: 'var(--accent-primary)' }} />
                Team Role Distribution
              </h3>
              {roleData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={roleData}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {roleData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      formatter={(val) => (
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{val}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No team data available</div>
              )}
            </div>
          </div>

          {/* ── Team Performance Table ── */}
          <SectionHeading>Team Performance Snapshot</SectionHeading>
          <div className="table-wrapper">
            {stats?.teamPerformance && stats.teamPerformance.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Team Member</th>
                    <th>Role</th>
                    <th>Leads Handled</th>
                    <th>Tickets Resolved</th>
                    <th>Conversion Rate</th>
                    <th>Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.teamPerformance.map(m => (
                    <tr key={m.name}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
                          }}>
                            {m.name.split(' ').map(w => w[0]).join('')}
                          </div>
                          <strong style={{ fontSize: 13 }}>{m.name}</strong>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{m.role}</td>
                      <td style={{ fontWeight: 600 }}>{m.leads || '—'}</td>
                      <td style={{ fontWeight: 600 }}>{m.tickets || '—'}</td>
                      <td style={{ color: 'var(--accent-success)', fontWeight: 600 }}>{m.conversionRate}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            flex: 1, height: 6, background: 'var(--bg-secondary)',
                            borderRadius: 3, overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${m.performance}%`, height: '100%', borderRadius: 3,
                              background: m.performance >= 90 ? C.green : m.performance >= 75 ? C.yellow : C.red,
                              transition: 'width 0.6s ease',
                            }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', minWidth: 30 }}>
                            {m.performance}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No team performance data available</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ExecutiveDashboardPage;
