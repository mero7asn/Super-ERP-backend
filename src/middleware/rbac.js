const SUPER_ADMIN_ROLES = [
  'Super CRM Administrator',
  'Super Admin',
  'Administrator',
  'CRM core Administrator',
  'Core 360 Administrator',
  'System Architect',
  'Executive User'
];

exports.SUPER_ADMIN_ROLES = SUPER_ADMIN_ROLES;

exports.isAdminRole = (role) => {
  if (!role) return false;
  if (SUPER_ADMIN_ROLES.includes(role)) return true;
  if (typeof role === 'string' && (role.toLowerCase().includes('admin') || role.toLowerCase().includes('super'))) {
    return true;
  }
  return false;
};

// Middleware to grant access to specific roles
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: 'User role is not defined.' });
    }

    // Super admin roles always have universal access
    if (exports.isAdminRole(req.user.role)) {
      return next();
    }

    const flatRoles = roles.flatMap(r => Array.isArray(r) ? r : [r]);
    if (flatRoles.includes('CRM core Administrator') && !flatRoles.includes('Core 360 Administrator')) {
      flatRoles.push('Core 360 Administrator');
    }
    if (flatRoles.includes('Core 360 Administrator') && !flatRoles.includes('CRM core Administrator')) {
      flatRoles.push('CRM core Administrator');
    }

    if (!flatRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `User role ${req.user.role} is not authorized to access this route` 
      });
    }
    
    next();
  };
};
