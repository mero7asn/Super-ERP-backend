import { NavLink, useNavigate, useMatch } from 'react-router-dom';
import logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';

// Clean vector SVG Icon Renderer
const SidebarIcon = ({ name }) => {
  const size = 18;
  const className = "sidebar-svg-icon";

  switch (name) {
    case 'teams':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      );
    case 'dashboard':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'leads':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
    case 'kanban':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        </svg>
      );
    case 'tickets':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M12 2H2v10l9.29 9.29c.39.39 1.02.39 1.41 0l7.59-7.59c.39-.39.39-1.02 0-1.41z" />
          <path d="m20 12-8-8" />
          <line x1="7" x2="7.01" y1="7" y2="7" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'bookings':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <line x1="9" x2="15" y1="9" y2="15" />
          <line x1="15" x2="9" y1="9" y2="15" />
        </svg>
      );
    case 'support':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" x2="12.01" y1="17" y2="17" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'campaigns':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="m3 11 18-5v12L3 13v-2Z" />
          <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
        </svg>
      );
    case 'analytics':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <line x1="18" x2="18" y1="20" y2="10" />
          <line x1="12" x2="12" y1="20" y2="4" />
          <line x1="6" x2="6" y1="20" y2="14" />
        </svg>
      );
    case 'executive':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
      );
    case 'users':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'settings':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case 'devtools':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" x2="20" y1="19" y2="19" />
        </svg>
      );
    default:
      return null;
  }
};

// Define which nav items are visible per role
const NAV_ITEMS = [
  {
    section: 'Main',
    items: [
      { label: 'Dashboard', icon: 'dashboard', path: '/dashboard', roles: null },
      { label: 'Leads', icon: 'leads', path: '/leads', roles: [
          'Super CRM Administrator', 'Sales Agent', 'Sales Manager',
          'Marketing Specialist', 'Marketing Manager', 'Executive User',
          'System Architect', 'Business Analyst'
        ]
      },
      { label: 'Teams', icon: 'teams', path: '/teams', roles: [
          'Super CRM Administrator', 'System Architect',
          'Sales Manager', 'Sales Agent',
          'Customer Support Manager', 'Customer Support Agent',
          'Marketing Manager', 'Marketing Specialist'
        ]
      },
      { label: 'Sales Dashboard', icon: 'kanban', path: '/kanban', roles: [
          'Super CRM Administrator', 'Sales Agent', 'Sales Manager',
          'Executive User', 'System Architect', 'Business Analyst'
        ]
      },
      { label: 'Technical Issues', icon: 'tickets', path: '/tickets', roles: null },
       { label: 'Bookings', icon: 'bookings', path: '/bookings', roles: [
           'Sales Agent', 'Sales Manager',
           'Customer Support Agent', 'Customer Support Manager',
           'CRM Developer', 'CRM Consultant', 'System Architect', 'Super CRM Administrator'
         ]
       },
       { label: 'Campaigns', icon: 'campaigns', path: '/campaigns', roles: [
          'Super CRM Administrator', 'Marketing Specialist',
          'Marketing Manager', 'Executive User', 'Business Analyst', 'System Architect'
        ]
      },
    ]
  },
  {
    section: 'Analytics',
    items: [
      { label: 'Analytics', icon: 'analytics', path: '/analytics', roles: [
          'Super CRM Administrator', 'Executive User',
          'Business Analyst', 'System Architect'
        ]
      },
      { label: 'Executive Dashboard', icon: 'executive', path: '/executive', roles: [
          'Super CRM Administrator', 'Executive User',
          'Business Analyst', 'System Architect'
        ]
      },
    ]
  },
  {
    section: 'Administration',
    items: [
      { label: 'User Management', icon: 'users', path: '/users', roles: [
          'Super CRM Administrator', 'System Architect'
        ]
      },
      { label: 'System Settings', icon: 'settings', path: '/settings', roles: [
          'Super CRM Administrator'
        ]
      },
      { label: 'CRM Dev Tools', icon: 'devtools', path: '/devtools', roles: [
          'CRM Developer', 'System Architect', 'Super CRM Administrator'
        ]
      },
    ]
  }
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const canSeeItem = (item) => {
    if (!item.roles) return true; // visible to all
    return item.roles.includes(user?.role);
  };

  const isUserProfile = useMatch('/users/:id');

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
    : '?';

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo-icon">
          <img src={logo} alt="Super CRM Logo" style={{ width: '38px', height: '38px', objectFit: 'contain' }} />
        </div>
        <span className="sidebar-logo-text">Super CRM</span>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((section) => {
          const visibleItems = section.items.filter(canSeeItem);
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.section}>
              <div className="sidebar-section-label">{section.section}</div>
              {visibleItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `sidebar-link${isActive || (item.path === '/users' && isUserProfile) ? ' active' : ''}`
                  }
                >
                  <span className="sidebar-link-icon">
                    <SidebarIcon name={item.icon} />
                  </span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={() => navigate(`/users/${user?._id}`)} style={{ cursor: 'pointer' }}>
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
        </div>
        <button
          className="sidebar-link btn-danger"
          onClick={handleLogout}
          style={{ marginTop: '8px', width: '100%', display: 'flex', alignItems: 'center', gap: '12px' }}
        >
          <span className="sidebar-link-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" x2="9" y1="12" y2="12" />
            </svg>
          </span>
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
