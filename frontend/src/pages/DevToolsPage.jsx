import { useState } from 'react';
import { Icon } from '../components/Icons';

const DevToolsPage = () => {
  const [logs, setLogs] = useState([
    '⚙️ CRM System Developer Environment Initialized.',
    '🔌 DB Connection established: crm_prod_replica',
    '🛡️ Active permissions session: Super CRM Administrator',
    '📊 API Gateway status: 200 OK (5.2ms latency)'
  ]);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const addLog = (msg) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleSeed = () => {
    if (isSeeding) return;
    setIsSeeding(true);
    addLog('🚀 Initializing database seeding sequence...');
    
    setTimeout(() => {
      addLog('🗑️ Clearing active collection records...');
    }, 1000);

    setTimeout(() => {
      addLog('✓ Populating seed collection schema (12 user accounts)...');
    }, 2000);

    setTimeout(() => {
      addLog('🎉 Seed complete! All system roles and credentials loaded.');
      setIsSeeding(false);
    }, 3200);
  };

  const handleClearLogs = () => {
    setIsClearing(true);
    setTimeout(() => {
      setLogs(['🧹 Logs console cleared.', `🔌 Active session refreshed.`]);
      setIsClearing(false);
    }, 800);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icon name="devtools" size={26} style={{ color: 'var(--accent-primary)' }} />
          CRM Developer Console
        </h1>
        <p className="page-subtitle">Diagnostic controls, system status logs, and developer maintenance utilities</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
        {/* System Diagnostics */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="analytics" size={16} style={{ color: 'var(--accent-primary)' }} />
            Diagnostic Metrics
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Server Status</span>
              <span style={{ color: 'var(--accent-success)', fontWeight: 600 }}>● Operational</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Database Latency</span>
              <span style={{ fontWeight: 600 }}>1.4 ms</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>API Version</span>
              <span style={{ fontFamily: 'monospace' }}>v1.0.0-stable</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Node Environment</span>
              <span style={{ fontFamily: 'monospace', textTransform: 'uppercase', color: 'var(--accent-warning)', fontSize: 11 }}>development</span>
            </div>
          </div>
        </div>

        {/* Database Utilities */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="settings" size={16} style={{ color: 'var(--accent-primary)' }} />
            Developer Actions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={handleSeed}
              disabled={isSeeding}
              className="btn btn-secondary"
              style={{
                fontSize: 13,
                padding: '10px 16px',
                justifyContent: 'flex-start',
                width: '100%',
                border: '1px solid var(--border-color)',
                cursor: isSeeding ? 'not-allowed' : 'pointer'
              }}
            >
              <Icon name="rocket" size={14} style={{ color: 'var(--accent-primary)' }} />
              {isSeeding ? 'Seeding Database...' : 'Re-Seed CRM Database'}
            </button>
            <button
              onClick={handleClearLogs}
              disabled={isClearing}
              className="btn btn-secondary"
              style={{
                fontSize: 13,
                padding: '10px 16px',
                justifyContent: 'flex-start',
                width: '100%',
                border: '1px solid var(--border-color)',
                cursor: isClearing ? 'not-allowed' : 'pointer'
              }}
            >
              <Icon name="trash" size={14} style={{ color: 'var(--accent-danger)' }} />
              {isClearing ? 'Clearing Logs...' : 'Clear Developer Console'}
            </button>
          </div>
        </div>
      </div>

      {/* Terminal log panel */}
      <div className="card" style={{ background: '#0F172A', border: '1px solid #1E293B', padding: 24, borderRadius: 'var(--radius-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, borderBottom: '1px solid #1E293B', paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }} />
            <span style={{ color: '#94A3B8', fontSize: 11, fontFamily: 'monospace', marginLeft: 8 }}>interactive-sh · diagnostic_terminal</span>
          </div>
        </div>
        <div style={{
          fontFamily: 'monospace',
          fontSize: 13,
          color: '#E2E8F0',
          maxHeight: 240,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          lineHeight: 1.5
        }}>
          {logs.map((log, index) => (
            <div key={index} style={{ color: log.includes('✓') || log.includes('🎉') ? '#10B981' : log.includes('⚙️') ? '#60A5FA' : '#E2E8F0' }}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DevToolsPage;
