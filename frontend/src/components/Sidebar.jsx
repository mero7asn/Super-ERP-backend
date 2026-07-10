import { useState } from 'react';
import { NavLink, useNavigate, useMatch } from 'react-router-dom';
import logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';

const SidebarIcon = ({ name }) => {
  const size = 18;
  const cls = 'sidebar-svg-icon';
  const p = { xmlns: 'http://www.w3.org/2000/svg', width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', className: cls };

  switch (name) {
    case 'dashboard':   return <svg {...p}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
    case 'leads':       return <svg {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
    case 'teams':       return <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case 'kanban':      return <svg {...p}><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>;
    case 'tickets':     return <svg {...p}><path d="M12 2H2v10l9.29 9.29c.39.39 1.02.39 1.41 0l7.59-7.59c.39-.39.39-1.02 0-1.41z"/><path d="m20 12-8-8"/><line x1="7" x2="7.01" y1="7" y2="7" strokeWidth="3" strokeLinecap="round"/></svg>;
    case 'bookings':    return <svg {...p}><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="9" x2="15" y1="9" y2="15"/><line x1="15" x2="9" y1="9" y2="15"/></svg>;
    case 'campaigns':   return <svg {...p}><path d="m3 11 18-5v12L3 13v-2Z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>;
    case 'analytics':   return <svg {...p}><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>;
    case 'executive':   return <svg {...p}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>;
    case 'users':       return <svg {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case 'settings':    return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
    case 'devtools':    return <svg {...p}><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>;
    case 'rtm':         return <svg {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
    case 'email':       return <svg {...p}><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>;
    case 'personal':    return <svg {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
    case 'calendar':   return <svg {...p}><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>;
    case 'payroll':     return <svg {...p}><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>;
    case 'training':    return <svg {...p}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>;
    case 'talent':      return <svg {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
    case 'partnerships':return <svg {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    default:            return null;
  }
};

const CRM_ROLES = [
  'Super CRM Administrator','Sales Agent','Sales Manager','Customer Support Agent',
  'Customer Support Manager','Marketing Specialist','Marketing Manager','Business Analyst',
  'CRM Developer','CRM Consultant','System Architect','Executive User','RTM Team Member',
];

const HRM_ROLES = [
  'HRM System Administrator','HR Manager','HR Specialist (Generalist)',
  'Recruitment Specialist (Talent Acquisition)','Payroll Specialist','HR Business Partner',
  'Training and Development Specialist','Performance Management Specialist',
  'Attendance and Time Officer','Employee (General User)','HR Director / Executive HR User',
  'RTM Team Member',
];

const CRM_NAV_ITEMS = [
  { label: 'Dashboard',          icon: 'dashboard', path: '/dashboard', roles: null },
  { label: 'Leads',              icon: 'leads',     path: '/leads',     roles: ['Super CRM Administrator','Sales Agent','Sales Manager','Marketing Specialist','Marketing Manager','Executive User','System Architect','Business Analyst'] },
  { label: 'Teams',              icon: 'teams',     path: '/teams',     roles: ['Super CRM Administrator','System Architect','Sales Manager','Sales Agent','Customer Support Manager','Customer Support Agent','Marketing Manager','Marketing Specialist'] },
  { label: 'Sales Dashboard',    icon: 'kanban',    path: '/kanban',    roles: ['Super CRM Administrator','Sales Agent','Sales Manager','Executive User','System Architect','Business Analyst'] },
  { label: 'Technical Issues',   icon: 'tickets',   path: '/tickets',   roles: null },
  { label: 'Bookings',           icon: 'bookings',  path: '/bookings',  roles: ['Sales Agent','Sales Manager','Customer Support Agent','Customer Support Manager','CRM Developer','CRM Consultant','System Architect','Super CRM Administrator'] },
  { label: 'Campaigns',          icon: 'campaigns', path: '/campaigns', roles: ['Super CRM Administrator','Marketing Specialist','Marketing Manager','Executive User','Business Analyst','System Architect'] },
  { label: 'Analytics',          icon: 'analytics', path: '/analytics', roles: ['Super CRM Administrator','Executive User','Business Analyst','System Architect'] },
  { label: 'Executive Dashboard',icon: 'executive', path: '/executive', roles: ['Super CRM Administrator','Executive User','Business Analyst','System Architect'] },
  { label: 'User Management',    icon: 'users',     path: '/users',     roles: ['Super CRM Administrator','System Architect'] },
  { label: 'System Settings',    icon: 'settings',  path: '/settings',  roles: ['Super CRM Administrator'] },
  { label: 'CRM Dev Tools',      icon: 'devtools',  path: '/devtools',  roles: ['CRM Developer','System Architect','Super CRM Administrator'] },
  { label: 'RTM Monitor',        icon: 'rtm',       path: '/rtm',       roles: ['RTM Team Member','Super CRM Administrator','HRM System Administrator','HR Manager'] },
];

const HRM_NAV_ITEMS = [
  { label: 'HRM Dashboard',             icon: 'dashboard',    path: '/hrm',              roles: null },
  { label: 'Personal',                  icon: 'personal',     path: '/hrm/personal',     roles: ['Super CRM Administrator','HRM System Administrator','HR Manager','HR Specialist (Generalist)','HR Business Partner','Employee (General User)'] },
  { label: 'Payroll',                   icon: 'payroll',      path: '/hrm/payroll',      roles: ['Super CRM Administrator','HRM System Administrator','HR Manager','Payroll Specialist','Employee (General User)'] },
  { label: 'Training',                  icon: 'training',     path: '/hrm/training',     roles: ['Super CRM Administrator','HRM System Administrator','HR Manager','Training and Development Specialist','Employee (General User)'] },
  { label: 'Talent Acquisition',        icon: 'talent',       path: '/hrm/talent',       roles: ['Super CRM Administrator','HRM System Administrator','HR Manager','Recruitment Specialist (Talent Acquisition)'] },
  { label: 'BD & People Culture',       icon: 'partnerships', path: '/hrm/partnerships', roles: ['Super CRM Administrator','HRM System Administrator','HR Manager','HR Business Partner','Employee (General User)'] },
];

// Employee Self-Service — visible to every authenticated user (own data only)
const ESS_NAV_ITEMS = [
  { label: 'My Schedule', icon: 'calendar', path: '/ess/schedule' },
  { label: 'My Payroll',  icon: 'payroll',  path: '/ess/payroll' },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [crmOpen, setCrmOpen] = useState(true);
  const [hrmOpen, setHrmOpen] = useState(true);
  const [essOpen, setEssOpen] = useState(true);

  const handleLogout = () => { logout(); navigate('/login'); };

  const canSee = (item) => !item.roles || item.roles.includes(user?.role);

  const isUserProfile = useMatch('/users/:id');

  const isSuperAdmin = user?.role === 'Super CRM Administrator';
  const showCRM = isSuperAdmin || CRM_ROLES.includes(user?.role);
  const showHRM = isSuperAdmin || HRM_ROLES.includes(user?.role);

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
    : '?';

  const SectionHeader = ({ label, open, onToggle }) => (
    <div
      className="sidebar-section-label"
      onClick={onToggle}
      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 8, userSelect: 'none' }}
    >
      <span>{label}</span>
      <span style={{ fontSize: 10 }}>{open ? '▼' : '▶'}</span>
    </div>
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo-icon">
          <img src={logo} alt="Super ERP Logo" style={{ width: 38, height: 38, objectFit: 'contain' }} />
        </div>
        <span className="sidebar-logo-text">Super ERP</span>
      </div>

      <nav className="sidebar-nav">
        {/* Global */}
        <div style={{ marginBottom: 16 }}>
          <NavLink to="/emails" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span className="sidebar-link-icon"><SidebarIcon name="email" /></span>
            Internal Emails
          </NavLink>
        </div>

        {/* Super CRM */}
        {showCRM && (
          <div style={{ marginBottom: 16 }}>
            <SectionHeader label="Super CRM" open={crmOpen} onToggle={() => setCrmOpen(o => !o)} />
            {crmOpen && (
              <div style={{ paddingLeft: 8 }}>
                {CRM_NAV_ITEMS.filter(canSee).map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `sidebar-link${isActive || (item.path === '/users' && isUserProfile) ? ' active' : ''}`
                    }
                  >
                    <span className="sidebar-link-icon"><SidebarIcon name={item.icon} /></span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Super HRM */}
        {showHRM && (
          <div style={{ marginBottom: 16 }}>
            <SectionHeader label="Super HRM" open={hrmOpen} onToggle={() => setHrmOpen(o => !o)} />
            {hrmOpen && (
              <div style={{ paddingLeft: 8 }}>
                {HRM_NAV_ITEMS.filter(canSee).map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                  >
                    <span className="sidebar-link-icon"><SidebarIcon name={item.icon} /></span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Employee Self-Service — visible to every authenticated user */}
        <div style={{ marginBottom: 16 }}>
          <SectionHeader label="My Workspace" open={essOpen} onToggle={() => setEssOpen(o => !o)} />
          {essOpen && (
            <div style={{ paddingLeft: 8 }}>
              {ESS_NAV_ITEMS.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                >
                  <span className="sidebar-link-icon"><SidebarIcon name={item.icon} /></span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={() => navigate(`/users/${user?._id}`)} style={{ cursor: 'pointer' }}>
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.firstName} {user?.lastName}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
        </div>
        <button
          className="sidebar-link btn-danger"
          onClick={handleLogout}
          style={{ marginTop: 8, width: '100%', display: 'flex', alignItems: 'center', gap: 12 }}
        >
          <span className="sidebar-link-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" x2="9" y1="12" y2="12"/>
            </svg>
          </span>
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
