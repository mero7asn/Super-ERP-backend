import { useState, useEffect } from 'react';
import { Icon } from '../components/Icons';
import API from '../services/api';

const PROVIDER_PRESETS = {
  gmail: { label: 'Gmail / Google Workspace', host: 'smtp.gmail.com', port: 587, secure: false },
  outlook: { label: 'Outlook / Microsoft 365', host: 'smtp.office365.com', port: 587, secure: false },
  custom: { label: 'Custom / Other', host: '', port: 587, secure: false },
};

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  // General settings
  const [appName, setAppName] = useState('Super CRM');
  const [companyName, setCompanyName] = useState('Super Enterprise Inc.');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Security settings
  const [sessionTimeout, setSessionTimeout] = useState('30d');
  const [twoFactor, setTwoFactor] = useState(true);

  // Notification settings
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [slackAlerts, setSlackAlerts] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');

  // Global SMTP settings
  const [smtpProvider, setSmtpProvider] = useState('custom');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');

  // AUX Config state
  const [availableAuxes, setAvailableAuxes] = useState([]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await API.get('/settings/email');
        if (data.success && data.data) {
          const cfg = data.data;
          setSmtpHost(cfg.smtpHost || '');
          setSmtpPort(cfg.smtpPort || 587);
          setSmtpSecure(cfg.smtpSecure || false);
          setSmtpUser(cfg.smtpUser || '');
          setSmtpPass('');
          const presetKey = Object.entries(PROVIDER_PRESETS).find(([, p]) => p.host === cfg.smtpHost && p.port === cfg.smtpPort);
          setSmtpProvider(presetKey ? presetKey[0] : 'custom');
        }
      } catch (err) {
        console.error('Failed to load email settings:', err);
      }
    };
    const fetchAuxSettings = async () => {
      try {
        const { data } = await API.get('/settings/aux');
        if (data.success && data.data) {
          setAvailableAuxes(data.data.availableAuxes || []);
        }
      } catch (err) {
        console.error('Failed to load AUX settings:', err);
      }
    };
    fetchSettings();
    fetchAuxSettings();
  }, []);

  const handleProviderChange = (key) => {
    setSmtpProvider(key);
    const preset = PROVIDER_PRESETS[key];
    if (preset) {
      setSmtpHost(preset.host);
      setSmtpPort(preset.port);
      setSmtpSecure(preset.secure);
    }
  };

  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    setSuccessMsg('General settings updated successfully.');
    setErrorMsg('');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleSaveAux = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { data } = await API.put('/settings/aux', { availableAuxes });
      if (data.success) {
        setSuccessMsg('AUX configurations saved successfully.');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to save AUX settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const payload = {
        smtpHost: smtpHost || null,
        smtpPort,
        smtpSecure,
        smtpUser: smtpUser || null,
        ...(smtpPass ? { smtpPass } : {}),
      };
      const { data } = await API.put('/settings/email', payload);
      if (data.success) {
        setSuccessMsg('Global SMTP settings saved successfully.');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to save email settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { data } = await API.post('/settings/email/test');
      if (data.success) {
        setSuccessMsg(data.message || 'Connection verified successfully');
      } else {
        setErrorMsg(data.message || 'Connection failed');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Test connection failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icon name="settings" size={26} style={{ color: 'var(--accent-primary)' }} />
          System Settings
        </h1>
        <p className="page-subtitle">Configure application settings, security rules, integrations, and alerts</p>
      </div>

      {(successMsg || errorMsg) && (
        <>
          {successMsg && <div className="alert alert-success">{successMsg}</div>}
          {errorMsg && <div className="alert alert-error">{errorMsg}</div>}
        </>
      )}

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: '1 0 200px', display: 'flex', flexDirection: 'column', gap: 4, padding: 16, height: 'fit-content' }}>
          <button
            onClick={() => setActiveTab('general')}
            className="sidebar-link"
            style={{
              background: activeTab === 'general' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
              color: activeTab === 'general' ? 'var(--accent-primary)' : 'var(--text-primary)',
              borderRadius: 'var(--radius-sm)',
              fontWeight: activeTab === 'general' ? 600 : 500,
              padding: '10px 16px',
            }}
          >
            General Profile
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className="sidebar-link"
            style={{
              background: activeTab === 'security' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
              color: activeTab === 'security' ? 'var(--accent-primary)' : 'var(--text-primary)',
              borderRadius: 'var(--radius-sm)',
              fontWeight: activeTab === 'security' ? 600 : 500,
              padding: '10px 16px',
            }}
          >
            Security & Auth
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            className="sidebar-link"
            style={{
              background: activeTab === 'integrations' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
              color: activeTab === 'integrations' ? 'var(--accent-primary)' : 'var(--text-primary)',
              borderRadius: 'var(--radius-sm)',
              fontWeight: activeTab === 'integrations' ? 600 : 500,
              padding: '10px 16px',
            }}
          >
            Integrations
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className="sidebar-link"
            style={{
              background: activeTab === 'notifications' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
              color: activeTab === 'notifications' ? 'var(--accent-primary)' : 'var(--text-primary)',
              borderRadius: 'var(--radius-sm)',
              fontWeight: activeTab === 'notifications' ? 600 : 500,
              padding: '10px 16px',
            }}
          >
            Alerts & Webhooks
          </button>
          <button
            onClick={() => setActiveTab('aux')}
            className="sidebar-link"
            style={{
              background: activeTab === 'aux' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
              color: activeTab === 'aux' ? 'var(--accent-primary)' : 'var(--text-primary)',
              borderRadius: 'var(--radius-sm)',
              fontWeight: activeTab === 'aux' ? 600 : 500,
              padding: '10px 16px',
            }}
          >
            🎛️ AUX Control
          </button>
        </div>

        <div className="card" style={{ flex: '3 0 450px', padding: 32 }}>
          <form onSubmit={activeTab === 'integrations' ? handleSaveEmail : activeTab === 'aux' ? handleSaveAux : handleSaveGeneral}>
            {activeTab === 'general' && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="globe" size={18} style={{ color: 'var(--accent-primary)' }} />
                  General System Configurations
                </h3>

                <div className="form-group">
                  <label className="form-label">Application Name</label>
                  <input
                    className="form-input"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input
                    className="form-input"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24 }}>
                  <input
                    type="checkbox"
                    id="maintenance"
                    checked={maintenanceMode}
                    onChange={(e) => setMaintenanceMode(e.target.checked)}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                  <label htmlFor="maintenance" style={{ fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
                    Enable Maintenance Mode (Restricts access to Administrators)
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="lock" size={18} style={{ color: 'var(--accent-primary)' }} />
                  Security Policy & Authentication
                </h3>

                <div className="form-group">
                  <label className="form-label">JWT Token Expiry</label>
                  <select
                    className="form-input"
                    value={sessionTimeout}
                    onChange={(e) => setSessionTimeout(e.target.value)}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="1d">1 Day</option>
                    <option value="7d">7 Days</option>
                    <option value="30d">30 Days (Default)</option>
                    <option value="90d">90 Days</option>
                  </select>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24 }}>
                  <input
                    type="checkbox"
                    id="twofactor"
                    checked={twoFactor}
                    onChange={(e) => setTwoFactor(e.target.checked)}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                  <label htmlFor="twofactor" style={{ fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
                    Enforce Multi-Factor Authentication (MFA) for all Managers
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'integrations' && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="plug" size={18} style={{ color: 'var(--accent-primary)' }} />
                  Global SMTP Relay (Fallback for all users)
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Configure a global SMTP relay. Users without personal SMTP settings will send emails through this relay. The sender name remains the user's name, but the From address is the relay mailbox.
                </p>

                <div className="form-group">
                  <label className="form-label">Provider Preset</label>
                  <select
                    className="form-input"
                    value={smtpProvider}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    style={{ cursor: 'pointer' }}
                  >
                    {Object.entries(PROVIDER_PRESETS).map(([key, preset]) => (
                      <option key={key} value={key}>{preset.label}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">SMTP Host</label>
                    <input
                      className="form-input"
                      placeholder="smtp.gmail.com"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">SMTP Port</label>
                    <input
                      className="form-input"
                      type="number"
                      placeholder="587"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(Number(e.target.value) || 587)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">SMTP Username / Email</label>
                    <input
                      className="form-input"
                      type="email"
                      placeholder="relay@yourdomain.com"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">SMTP Password / App Password</label>
                    <input
                      className="form-input"
                      type="password"
                      placeholder="••••••••"
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                      type="checkbox"
                      id="smtpSecure"
                      checked={smtpSecure}
                      onChange={(e) => setSmtpSecure(e.target.checked)}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                    <label htmlFor="smtpSecure" style={{ fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
                      Use SSL/TLS (port 465). Uncheck for STARTTLS (port 587).
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                  <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: 'auto', padding: '10px 32px' }}>
                    {loading ? 'Saving…' : 'Save SMTP Settings'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={handleTestConnection} disabled={testing || !smtpHost} style={{ width: 'auto', padding: '10px 32px' }}>
                    {testing ? 'Testing…' : 'Test Connection'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="megaphone" size={18} style={{ color: 'var(--accent-primary)' }} />
                  Automated Alerts & Webhook Integrations
                </h3>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <input
                    type="checkbox"
                    id="emailAlerts"
                    checked={emailAlerts}
                    onChange={(e) => setEmailAlerts(e.target.checked)}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                  <label htmlFor="emailAlerts" style={{ fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
                    Enable Email Alerts for high-priority technical issues
                  </label>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <input
                    type="checkbox"
                    id="slackAlerts"
                    checked={slackAlerts}
                    onChange={(e) => setSlackAlerts(e.target.checked)}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                  <label htmlFor="slackAlerts" style={{ fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
                    Post webhook updates to Slack on lead conversions
                  </label>
                </div>

                {slackAlerts && (
                  <div className="form-group">
                    <label className="form-label">Slack Webhook URL</label>
                    <input
                      type="url"
                      className="form-input"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>
            )}
            {activeTab === 'aux' && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  🎛️ AUX Control & Target Settings
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
                  Configure the AUX states available to your agents and define whether their durations are fixed or flexible.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {availableAuxes.map((aux, idx) => (
                    <div key={aux.name} style={{ padding: 16, border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>
                          {aux.icon} {aux.name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="checkbox"
                            id={`aux-enable-${aux.name}`}
                            checked={aux.enabled}
                            onChange={(e) => {
                              const copy = [...availableAuxes];
                              copy[idx].enabled = e.target.checked;
                              setAvailableAuxes(copy);
                            }}
                            style={{ width: 16, height: 16, cursor: 'pointer' }}
                          />
                          <label htmlFor={`aux-enable-${aux.name}`} style={{ fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            Enabled
                          </label>
                        </div>
                      </div>

                      {aux.enabled && (
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
                          <div style={{ flex: 1, minWidth: 150 }}>
                            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Timing Mode</label>
                            <select
                              className="form-input"
                              value={aux.timingMode}
                              onChange={(e) => {
                                const copy = [...availableAuxes];
                                copy[idx].timingMode = e.target.value;
                                if (e.target.value === 'flexible') copy[idx].defaultMinutes = null;
                                else copy[idx].defaultMinutes = aux.name === 'Lunch' ? 30 : 15;
                                setAvailableAuxes(copy);
                              }}
                              style={{ padding: '6px 10px', fontSize: 12 }}
                            >
                              <option value="fixed">Fixed Duration</option>
                              <option value="flexible">Flexible / Dynamic</option>
                            </select>
                          </div>

                          {aux.timingMode === 'fixed' && (
                            <div style={{ flex: 1, minWidth: 150 }}>
                              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Duration (Minutes)</label>
                              <input
                                type="number"
                                className="form-input"
                                value={aux.defaultMinutes || 0}
                                onChange={(e) => {
                                  const copy = [...availableAuxes];
                                  copy[idx].defaultMinutes = parseInt(e.target.value) || 0;
                                  setAvailableAuxes(copy);
                                }}
                                style={{ padding: '6px 10px', fontSize: 12 }}
                                min={1}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab !== 'integrations' && (
              <>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '24px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '10px 32px' }}>
                    Save Preferences
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
