/**
 * Canonical granular permission catalog.
 *
 * Super admins can grant users very specific, per-feature access instead of
 * coarse roles. Each permission is a stable key (dotted `module.action.object`)
 * so it can be stored directly on `User.permissions` as a boolean map.
 *
 * The same catalog is mirrored on the frontend (services/permissions.js) so the
 * profile UI and the backend stay in sync.
 */
const PERMISSION_CATALOG = [
  // ── Leads / CRM pipeline ───────────────────────────────────────
  {
    group: 'Leads & CRM Pipeline',
    items: [
      { key: 'leads.view.own', label: 'View own assigned leads', desc: 'See leads assigned to this user only.' },
      { key: 'leads.view.team', label: 'View team leads', desc: 'See all leads owned by the user’s team.' },
      { key: 'leads.view.all', label: 'View all leads', desc: 'See every lead across the system.' },
      { key: 'leads.create', label: 'Create leads', desc: 'Manually add new leads.' },
      { key: 'leads.edit.own', label: 'Edit own leads', desc: 'Modify leads assigned to this user.' },
      { key: 'leads.edit.all', label: 'Edit any lead', desc: 'Modify any lead regardless of owner.' },
      { key: 'leads.delete.own', label: 'Delete own leads', desc: 'Remove leads assigned to this user.' },
      { key: 'leads.delete.all', label: 'Delete any lead', desc: 'Remove any lead in the system.' },
      { key: 'leads.export', label: 'Export leads', desc: 'Download/export lead lists.' },
      { key: 'leads.reassign', label: 'Reassign leads', desc: 'Move leads between agents/teams.' },
      { key: 'leads.distribute', label: 'Lead distribution', desc: 'Access the lead distribution board.' },
      { key: 'leads.kanban', label: 'Sales Kanban board', desc: 'Use the sales kanban view.' },
    ],
  },

  // ── Offers & Bookings ──────────────────────────────────────────
  {
    group: 'Offers & Bookings',
    items: [
      { key: 'offers.create', label: 'Create offers', desc: 'Build new offers for a lead.' },
      { key: 'offers.edit.own', label: 'Edit own offers', desc: 'Edit offers this user created.' },
      { key: 'offers.edit.all', label: 'Edit any offer', desc: 'Edit offers created by anyone.' },
      { key: 'offers.send', label: 'Send offers (email/SMS)', desc: 'Dispatch offers to leads.' },
      { key: 'offers.revise', label: 'Revise offers', desc: 'Freeze a version and open a new draft.' },
      { key: 'offers.delete', label: 'Delete offers', desc: 'Remove offers.' },
      { key: 'offers.templates', label: 'Manage offer templates', desc: 'Create/edit public & private templates.' },
      { key: 'offers.view.all', label: 'View all offers', desc: 'See offers across all users.' },
      { key: 'offers.images', label: 'Upload offer images', desc: 'Attach photos/documents to offers.' },
      { key: 'bookings.view', label: 'View bookings (lookup)', desc: 'Search bookings by record locator.' },
      { key: 'bookings.cancel', label: 'Cancel bookings', desc: 'Cancel a generated booking.' },
      { key: 'bookings.refund', label: 'Refund bookings', desc: 'Process a refund on a booking.' },
      { key: 'bookings.complete', label: 'Mark booking complete', desc: 'Mark a booking as completed.' },
      { key: 'payment.link.generate', label: 'Generate payment links', desc: 'Create public pay-now links for offers.' },
      { key: 'payment.process', label: 'Process payments', desc: 'Take payments via the public page (sim/real).' },
    ],
  },

  // ── Tickets / Support ──────────────────────────────────────────
  {
    group: 'Support Tickets',
    items: [
      { key: 'tickets.view.own', label: 'View own tickets', desc: 'See tickets assigned to this user.' },
      { key: 'tickets.view.all', label: 'View all tickets', desc: 'See every support ticket.' },
      { key: 'tickets.reply', label: 'Reply to tickets', desc: 'Add responses to tickets.' },
      { key: 'tickets.create', label: 'Create tickets', desc: 'Open new tickets.' },
      { key: 'tickets.edit', label: 'Edit tickets', desc: 'Modify ticket details.' },
      { key: 'tickets.delete', label: 'Delete tickets', desc: 'Remove tickets.' },
      { key: 'tickets.assign', label: 'Assign tickets', desc: 'Reassign tickets to agents.' },
      { key: 'tickets.export', label: 'Export tickets', desc: 'Download ticket data.' },
    ],
  },

  // ── Campaigns & Marketing ──────────────────────────────────────
  {
    group: 'Campaigns & Marketing',
    items: [
      { key: 'campaigns.view', label: 'View campaigns', desc: 'See marketing campaigns.' },
      { key: 'campaigns.create', label: 'Create campaigns', desc: 'Build new campaigns.' },
      { key: 'campaigns.edit', label: 'Edit campaigns', desc: 'Modify existing campaigns.' },
      { key: 'campaigns.delete', label: 'Delete campaigns', desc: 'Remove campaigns.' },
      { key: 'campaigns.form.generate', label: 'Generate lead forms', desc: 'Create public campaign lead-form links.' },
      { key: 'campaigns.form.embed', label: 'Embed/configure forms', desc: 'Configure and embed lead capture forms.' },
      { key: 'marketing.assets', label: 'Manage marketing assets', desc: 'Upload/configure marketing assets.' },
    ],
  },

  // ── Analytics & Reporting ──────────────────────────────────────
  {
    group: 'Analytics & Reporting',
    items: [
      { key: 'analytics.view.sales', label: 'Sales analytics', desc: 'View sales performance dashboards.' },
      { key: 'analytics.view.executive', label: 'Executive dashboard', desc: 'Access the executive dashboard.' },
      { key: 'analytics.view.rtm', label: 'RTM live monitor', desc: 'Use the real-time monitoring view.' },
      { key: 'analytics.export', label: 'Export reports', desc: 'Download analytics/reports.' },
      { key: 'analytics.custom', label: 'Build custom reports', desc: 'Create custom report views.' },
    ],
  },

  // ── User & Access Management ───────────────────────────────────
  {
    group: 'User & Access Management',
    items: [
      { key: 'users.view', label: 'View users', desc: 'See the user directory.' },
      { key: 'users.create', label: 'Create users', desc: 'Add new system users.' },
      { key: 'users.edit', label: 'Edit users', desc: 'Modify user profiles.' },
      { key: 'users.delete', label: 'Delete users', desc: 'Remove users.' },
      { key: 'users.suspend', label: 'Suspend/activate users', desc: 'Toggle account active status.' },
      { key: 'users.roles.assign', label: 'Assign roles', desc: 'Change a user’s role.' },
      { key: 'users.permissions.edit', label: 'Edit permissions', desc: 'Grant/revoke granular permissions.' },
      { key: 'users.teams.manage', label: 'Manage teams', desc: 'Configure team hierarchy.' },
    ],
  },

  // ── HRM / Payroll / ESS ────────────────────────────────────────
  {
    group: 'HRM, Payroll & ESS',
    items: [
      { key: 'hrm.contracts.view', label: 'View contracts', desc: 'See employee contracts.' },
      { key: 'hrm.contracts.edit', label: 'Edit contracts', desc: 'Modify employment contracts.' },
      { key: 'hrm.schedules.view', label: 'View schedules', desc: 'See employee schedules.' },
      { key: 'hrm.schedules.edit', label: 'Edit schedules', desc: 'Assign/update schedules.' },
      { key: 'hrm.leaves.approve', label: 'Approve leave', desc: 'Approve/deny leave requests.' },
      { key: 'hrm.govdocs.verify', label: 'Verify gov documents', desc: 'Verify Egypt compliance docs.' },
      { key: 'hrm.training.manage', label: 'Manage training', desc: 'Create/edit training records.' },
      { key: 'hrm.talent.manage', label: 'Manage recruitment', desc: 'Handle vacancies & candidates.' },
      { key: 'hrm.partnerships.manage', label: 'Manage partnerships', desc: 'Handle benefit partnerships.' },
      { key: 'payroll.runs.generate', label: 'Generate payroll runs', desc: 'Create salary/bonus runs.' },
      { key: 'payroll.runs.approve', label: 'Approve payroll runs', desc: 'Approve payroll runs.' },
      { key: 'payroll.runs.release', label: 'Release payroll', desc: 'Release/simulate disbursement.' },
      { key: 'payroll.paymentmethods.approve', label: 'Approve payment methods', desc: 'Verify employee cards.' },
      { key: 'payroll.bank.verify', label: 'Verify bank accounts', desc: 'Verify employee bank accounts.' },
      { key: 'payroll.loans.manage', label: 'Manage loans', desc: 'Create/approve salary advances.' },
      { key: 'payroll.alerts.view', label: 'View payroll alerts', desc: 'See payroll anomaly alerts.' },
      { key: 'ess.payslips.view', label: 'View own payslips', desc: 'Employee self-service payslips.' },
      { key: 'ess.schedule.view', label: 'View own schedule', desc: 'Employee self-service schedule.' },
      { key: 'ess.paymentmethods.manage', label: 'Manage own payment method', desc: 'Add/submit own card.' },
    ],
  },

  // ── System / Settings / Integrations ───────────────────────────
  {
    group: 'System, Settings & Integrations',
    items: [
      { key: 'settings.view', label: 'View system settings', desc: 'Open settings panels.' },
      { key: 'settings.edit', label: 'Edit system settings', desc: 'Change global settings.' },
      { key: 'settings.aux.configure', label: 'Configure AUX', desc: 'Manage AUX states & targets.' },
      { key: 'settings.email.global', label: 'Configure global SMTP', desc: 'Set company-wide email relay.' },
      { key: 'gateway.manage', label: 'Manage payment gateways', desc: 'Configure Fawry/PayMob/etc.' },
      { key: 'gateway.bank.manage', label: 'Manage company bank', desc: 'Configure source accounts.' },
      { key: 'devtools.view', label: 'Use dev tools', desc: 'Access CRM developer tools.' },
      { key: 'audit.view', label: 'View audit logs', desc: 'See audit/history logs.' },
      { key: 'integrations.manage', label: 'Manage integrations', desc: 'Configure third-party integrations.' },
    ],
  },

  // ── Communication ──────────────────────────────────────────────
  {
    group: 'Communication',
    items: [
      { key: 'email.send', label: 'Send internal email', desc: 'Use the internal email composer.' },
      { key: 'email.view.inbox', label: 'View own inbox', desc: 'Access personal inbox.' },
      { key: 'email.view.all', label: 'View all mail', desc: 'Access any user’s mailbox.' },
      { key: 'sms.send', label: 'Send SMS', desc: 'Dispatch SMS messages.' },
      { key: 'avaya.call', label: 'Make Avaya calls', desc: 'Initiate calls to leads.' },
      { key: 'notifications.view', label: 'View notifications', desc: 'See workspace notifications.' },
    ],
  },
];

// Flatten to a lookup: key -> { label, desc, group }
const PERMISSION_MAP = {};
PERMISSION_CATALOG.forEach(g => g.items.forEach(i => {
  PERMISSION_MAP[i.key] = { ...i, group: g.group };
}));

// Default permission set granted when no specific permission is on (safe denial).
const DEFAULT_PERMISSIONS = {};
Object.keys(PERMISSION_MAP).forEach(k => { DEFAULT_PERMISSIONS[k] = false; });

module.exports = {
  PERMISSION_CATALOG,
  PERMISSION_MAP,
  DEFAULT_PERMISSIONS,
  ALL_PERMISSION_KEYS: Object.keys(PERMISSION_MAP),
};
