import { useState } from 'react';
import { Icon } from '../components/Icons';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [successMsg, setSuccessMsg] = useState('');

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

  const handleSave = async (e) => {
    e.preventDefault();
    setSuccessMsg('System settings updated successfully.');
    setTimeout(() => setSuccessMsg(''), 4000);
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

      {successMsg && <div className="alert alert-success">{successMsg}</div>}

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
        </div>

        <div className="card" style={{ flex: '3 0 450px', padding: 32 }}>
          <form onSubmit={handleSave}>
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
                  Third-Party Integrations
                </h3>
                <div className="form-group">
                  <label className="form-label">SendGrid API Key <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Email)</span></label>
                  <input className="form-input" type="password" placeholder="SG.xxxxxxxxxxxxxx" />
                </div>
                <div className="form-group" style={{ marginTop: 16 }}>
                  <label className="form-label">Twilio Account SID <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(SMS)</span></label>
                  <input className="form-input" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
                </div>
                <div className="form-group" style={{ marginTop: 16 }}>
                  <label className="form-label">Twilio Auth Token</label>
                  <input className="form-input" type="password" placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
                </div>
                <div className="form-group" style={{ marginTop: 16 }}>
                  <label className="form-label">Twilio Phone Number</label>
                  <input className="form-input" placeholder="+1234567890" />
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

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '24px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '10px 32px' }}>
                Save Preferences
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;