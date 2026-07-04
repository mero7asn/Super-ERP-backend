import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icons';
import API from '../services/api';

// Role groupings for greeting context
const ROLE_GROUPS = {
  sales: ['Sales Agent', 'Sales Manager'],
  support: ['Customer Support Agent', 'Customer Support Manager'],
  marketing: ['Marketing Specialist', 'Marketing Manager'],
  analytics: ['Business Analyst', 'Executive User'],
  admin: ['Super CRM Administrator', 'System Architect', 'CRM Developer', 'CRM Consultant'],
};

const getRoleGroup = (role) => {
  for (const [group, roles] of Object.entries(ROLE_GROUPS)) {
    if (roles.includes(role)) return group;
  }
  return 'admin';
};

const ROLE_CARDS = {
  sales: [
    { label: 'My Leads', value: '–', icon: 'target', color: 'blue' },
    { label: 'Contacted', value: '–', icon: 'phone', color: 'cyan' },
    { label: 'Converted', value: '–', icon: 'check', color: 'green' },
    { label: 'Lost', value: '–', icon: 'close', color: 'red' },
  ],
  support: [
    { label: 'My Tickets', value: '–', icon: 'ticket', color: 'blue' },
    { label: 'Open', value: '–', icon: 'unlock', color: 'cyan' },
    { label: 'Resolved', value: '–', icon: 'check', color: 'green' },
    { label: 'Urgent', value: '–', icon: 'alert', color: 'red' },
  ],
  marketing: [
    { label: 'Campaigns', value: '–', icon: 'megaphone', color: 'blue' },
    { label: 'Active', value: '–', icon: 'play', color: 'green' },
    { label: 'Meta Leads', value: '–', icon: 'like', color: 'cyan' },
    { label: 'Google Leads', value: '–', icon: 'search', color: 'yellow' },
  ],
  analytics: [
    { label: 'Total Leads', value: '–', icon: 'target', color: 'blue' },
    { label: 'Total Tickets', value: '–', icon: 'ticket', color: 'cyan' },
    { label: 'Active Campaigns', value: '–', icon: 'megaphone', color: 'green' },
    { label: 'Conversion Rate', value: '–', icon: 'trending', color: 'yellow' },
  ],
  admin: [
    { label: 'Total Leads', value: '–', icon: 'target', color: 'blue' },
    { label: 'Open Tickets', value: '–', icon: 'ticket', color: 'cyan' },
    { label: 'Active Campaigns', value: '–', icon: 'megaphone', color: 'green' },
    { label: 'System Users', value: '–', icon: 'users', color: 'yellow' },
  ],
};

const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const group = getRoleGroup(user?.role);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [leadsRes, ticketsRes, campaignsRes, usersRes] = await Promise.all([
          API.get('/leads').catch(() => ({ data: { data: [] } })),
          API.get('/tickets').catch(() => ({ data: { data: [] } })),
          API.get('/campaigns').catch(() => ({ data: { data: [] } })),
          ['Super CRM Administrator', 'System Architect'].includes(user?.role) 
            ? API.get('/auth/users').catch(() => ({ data: { data: [] } }))
            : Promise.resolve({ data: { data: [] } })
        ]);

        const leads = leadsRes.data.data || [];
        const tickets = ticketsRes.data.data || [];
        const campaigns = campaignsRes.data.data || [];
        const users = usersRes.data.data || [];

        setStats({
          totalLeads: leads.length,
          myLeads: leads.filter(l => l.assignedTo?._id === user._id || l.assignedTo === user._id).length,
          contactedLeads: leads.filter(l => l.status === 'Contacted').length,
          convertedLeads: leads.filter(l => l.status === 'Converted').length,
          lostLeads: leads.filter(l => l.status === 'Lost').length,
          metaLeads: leads.filter(l => l.source === 'Meta').length,
          googleLeads: leads.filter(l => l.source === 'Google').length,
          totalTickets: tickets.length,
          myTickets: tickets.filter(t => t.assignedTo?._id === user._id || t.assignedTo === user._id).length,
          openTickets: tickets.filter(t => t.status === 'Open').length,
          resolvedTickets: tickets.filter(t => t.status === 'Resolved').length,
          urgentTickets: tickets.filter(t => t.priority === 'Urgent').length,
          totalCampaigns: campaigns.length,
          activeCampaigns: campaigns.filter(c => c.status === 'Active').length,
          totalUsers: users.length,
          conversionRate: leads.length > 0 ? Math.round((leads.filter(l => l.status === 'Converted').length / leads.length) * 100) : 0
        });
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user]);

  const getCardValue = (label) => {
    if (!stats) return '–';
    const map = {
      'My Leads': stats.myLeads,
      'Contacted': stats.contactedLeads,
      'Converted': stats.convertedLeads,
      'Lost': stats.lostLeads,
      'My Tickets': stats.myTickets,
      'Open': stats.openTickets,
      'Resolved': stats.resolvedTickets,
      'Urgent': stats.urgentTickets,
      'Campaigns': stats.totalCampaigns,
      'Active': stats.activeCampaigns,
      'Meta Leads': stats.metaLeads,
      'Google Leads': stats.googleLeads,
      'Total Leads': stats.totalLeads,
      'Total Tickets': stats.totalTickets,
      'Active Campaigns': stats.activeCampaigns,
      'Conversion Rate': `${stats.conversionRate}%`,
      'System Users': stats.totalUsers,
      'Open Tickets': stats.openTickets
    };
    return map[label] || '–';
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {greeting}, {user?.firstName}
        </h1>
        <p className="page-subtitle">
          Logged in as <strong style={{ color: 'var(--accent-secondary)' }}>{user?.role}</strong>
          &nbsp;· Here's your workspace overview.
        </p>
      </div>

      <div className="stat-grid">
        {ROLE_CARDS[group].map((card) => (
          <div key={card.label} className={`stat-card ${card.color}`}>
            <div className="stat-icon" style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
              <Icon name={card.icon} size={24} />
            </div>
            <div className="stat-value">{loading ? '–' : getCardValue(card.label)}</div>
            <div className="stat-label">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '12px', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon name="unlock" size={16} style={{ color: 'var(--accent-secondary)' }} />
          Your Access Permissions
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {user?.permissions &&
            Object.entries(user.permissions)
              .filter(([, val]) => val)
              .map(([key]) => (
                <span key={key} className="badge badge-new" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Icon name="check" size={12} />
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                </span>
              ))}
          {(!user?.permissions || Object.values(user.permissions).every(v => !v)) && (
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              Permissions are managed by role. Contact your administrator.
            </span>
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '12px', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon name="rocket" size={18} style={{ color: 'var(--accent-primary)' }} />
          Quick Actions
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
          Navigate to your section using the sidebar. Your navigation menu shows only the modules 
          relevant to your role as <strong>{user?.role}</strong>.
        </p>
      </div>
    </div>
  );
};

export default DashboardPage;
