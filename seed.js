const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./src/models/User');

const SEED_USERS = [
  {
    firstName: 'Super',
    lastName: 'Admin',
    email: 'super.admin@crm.com',
    password: 'Admin@1234',
    role: 'Super CRM Administrator',
    permissions: {
      canViewLeads: true, canEditLeads: true, canDeleteLeads: true,
      canViewTickets: true, canEditTickets: true, canDeleteTickets: true,
      canManageCampaigns: true, canManageUsers: true
    }
  },
  {
    firstName: 'Sales',
    lastName: 'Agent',
    email: 'sales.agent@crm.com',
    password: 'Agent@1234',
    role: 'Sales Agent',
    permissions: {
      canViewLeads: true, canEditLeads: true, canDeleteLeads: false,
      canViewTickets: false, canEditTickets: false, canDeleteTickets: false,
      canManageCampaigns: false, canManageUsers: false
    }
  },
  {
    firstName: 'Sales',
    lastName: 'Manager',
    email: 'sales.manager@crm.com',
    password: 'Manager@1234',
    role: 'Sales Manager',
    permissions: {
      canViewLeads: true, canEditLeads: true, canDeleteLeads: true,
      canViewTickets: false, canEditTickets: false, canDeleteTickets: false,
      canManageCampaigns: false, canManageUsers: false
    }
  },
  {
    firstName: 'Support',
    lastName: 'Agent',
    email: 'support.agent@crm.com',
    password: 'Support@1234',
    role: 'Customer Support Agent',
    permissions: {
      canViewLeads: false, canEditLeads: false, canDeleteLeads: false,
      canViewTickets: true, canEditTickets: true, canDeleteTickets: false,
      canManageCampaigns: false, canManageUsers: false
    }
  },
  {
    firstName: 'Support',
    lastName: 'Manager',
    email: 'support.manager@crm.com',
    password: 'Support@1234',
    role: 'Customer Support Manager',
    permissions: {
      canViewLeads: false, canEditLeads: false, canDeleteLeads: false,
      canViewTickets: true, canEditTickets: true, canDeleteTickets: true,
      canManageCampaigns: false, canManageUsers: false
    }
  },
  {
    firstName: 'Marketing',
    lastName: 'Specialist',
    email: 'marketing.specialist@crm.com',
    password: 'Market@1234',
    role: 'Marketing Specialist',
    permissions: {
      canViewLeads: true, canEditLeads: false, canDeleteLeads: false,
      canViewTickets: false, canEditTickets: false, canDeleteTickets: false,
      canManageCampaigns: true, canManageUsers: false
    }
  },
  {
    firstName: 'Marketing',
    lastName: 'Manager',
    email: 'marketing.manager@crm.com',
    password: 'Market@1234',
    role: 'Marketing Manager',
    permissions: {
      canViewLeads: true, canEditLeads: true, canDeleteLeads: false,
      canViewTickets: false, canEditTickets: false, canDeleteTickets: false,
      canManageCampaigns: true, canManageUsers: false
    }
  },
  {
    firstName: 'Business',
    lastName: 'Analyst',
    email: 'analyst@crm.com',
    password: 'Analyst@1234',
    role: 'Business Analyst',
    permissions: {
      canViewLeads: true, canEditLeads: false, canDeleteLeads: false,
      canViewTickets: true, canEditTickets: false, canDeleteTickets: false,
      canManageCampaigns: false, canManageUsers: false
    }
  },
  {
    firstName: 'CRM',
    lastName: 'Developer',
    email: 'crm.dev@crm.com',
    password: 'DevCRM@1234',
    role: 'CRM Developer',
    permissions: {
      canViewLeads: true, canEditLeads: true, canDeleteLeads: true,
      canViewTickets: true, canEditTickets: true, canDeleteTickets: true,
      canManageCampaigns: true, canManageUsers: true
    }
  },
  {
    firstName: 'CRM',
    lastName: 'Consultant',
    email: 'crm.consultant@crm.com',
    password: 'Consult@1234',
    role: 'CRM Consultant',
    permissions: {
      canViewLeads: true, canEditLeads: false, canDeleteLeads: false,
      canViewTickets: true, canEditTickets: false, canDeleteTickets: false,
      canManageCampaigns: false, canManageUsers: false
    }
  },
  {
    firstName: 'System',
    lastName: 'Architect',
    email: 'architect@crm.com',
    password: 'Arch@1234',
    role: 'System Architect',
    permissions: {
      canViewLeads: true, canEditLeads: true, canDeleteLeads: true,
      canViewTickets: true, canEditTickets: true, canDeleteTickets: true,
      canManageCampaigns: true, canManageUsers: true
    }
  },
  {
    firstName: 'Executive',
    lastName: 'User',
    email: 'executive@crm.com',
    password: 'Exec@1234',
    role: 'Executive User',
    permissions: {
      canViewLeads: true, canEditLeads: false, canDeleteLeads: false,
      canViewTickets: true, canEditTickets: false, canDeleteTickets: false,
      canManageCampaigns: false, canManageUsers: false
    }
  },
  {
    firstName: 'HRM',
    lastName: 'Admin',
    email: 'hrm.admin@erp.com',
    password: 'Admin@1234',
    role: 'HRM System Administrator',
    department: 'HR'
  },
  {
    firstName: 'HR',
    lastName: 'Manager',
    email: 'hr.manager@erp.com',
    password: 'Manager@1234',
    role: 'HR Manager',
    department: 'HR',
    isPersonalTeamLeader: true // designated team leader
  },
  {
    firstName: 'HR',
    lastName: 'Specialist',
    email: 'hr.spec@erp.com',
    password: 'Specialist@1234',
    role: 'HR Specialist (Generalist)',
    department: 'Personal'
  },
  {
    firstName: 'Talent',
    lastName: 'Acquisition',
    email: 'talent@erp.com',
    password: 'Talent@1234',
    role: 'Recruitment Specialist (Talent Acquisition)',
    department: 'Talent Acquisition'
  },
  {
    firstName: 'Payroll',
    lastName: 'Specialist',
    email: 'payroll@erp.com',
    password: 'Payroll@1234',
    role: 'Payroll Specialist',
    department: 'Payroll'
  },
  {
    firstName: 'HR',
    lastName: 'Partner',
    email: 'hrbp@erp.com',
    password: 'Hrbp@1234',
    role: 'HR Business Partner',
    department: 'HR'
  },
  {
    firstName: 'Training',
    lastName: 'Specialist',
    email: 'training@erp.com',
    password: 'Training@1234',
    role: 'Training and Development Specialist',
    department: 'Training'
  },
  {
    firstName: 'Employee',
    lastName: 'One',
    email: 'employee1@erp.com',
    password: 'Employee@1234',
    role: 'Employee (General User)',
    department: 'Sales'
  }
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    // Clear existing users
    await User.deleteMany({});
    console.log('🗑️  Cleared existing users');

    // Insert users (Mongoose model pre-save hook will hash passwords automatically)
    for (const u of SEED_USERS) {
      await User.create(u);
      console.log(`   ✓ Created [${u.role}] → ${u.email}`);
    }

    console.log('\n🎉 Seed complete! 12 users created.\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
};

seed();
