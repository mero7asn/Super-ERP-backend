export const DEPARTMENTS = [
  {
    id: 'Sales',
    label: '💼 Sales',
    roles: ['Sales Agent', 'Sales Manager'],
  },
  {
    id: 'Customer Support',
    label: '🎧 Customer Support',
    roles: ['Customer Support Agent', 'Customer Support Manager'],
  },
  {
    id: 'Marketing',
    label: '📣 Marketing',
    roles: ['Marketing Specialist', 'Marketing Manager'],
  },
  {
    id: 'Technology',
    label: '💻 Technology',
    roles: ['CRM Developer', 'CRM Consultant', 'System Architect', 'Business Analyst'],
  },
  {
    id: 'Executive',
    label: '🏛 Executive',
    roles: ['Executive User', 'Super CRM Administrator'],
  },
  {
    id: 'Human Resources',
    label: '👥 Human Resources',
    roles: [
      'HRM System Administrator',
      'HR Manager',
      'HR Director / Executive HR User',
      'HR Specialist (Generalist)',
      'HR Business Partner',
      'Recruitment Specialist (Talent Acquisition)',
      'Payroll Specialist',
      'Training and Development Specialist',
      'Performance Management Specialist',
      'Attendance and Time Officer',
      'Employee (General User)',
    ],
  },
];

export const ALL_ROLES = DEPARTMENTS.flatMap((d) => d.roles);

export const getRolesByDepartment = (deptId) =>
  DEPARTMENTS.find((d) => d.id === deptId)?.roles || [];

export const getDepartmentByRole = (role) =>
  DEPARTMENTS.find((d) => d.roles.includes(role))?.id || '';
