const mongoose = require('mongoose');
const User = require('../src/models/User');
const Lead = require('../src/models/Lead');
const Ticket = require('../src/models/Ticket');
const Campaign = require('../src/models/Campaign');

mongoose.connect('mongodb://localhost:27017/super-crm');

const seedData = async () => {
  try {
    console.log('Clearing existing data...');
    await Lead.deleteMany({});
    await Ticket.deleteMany({});
    await Campaign.deleteMany({});

    console.log('Finding users...');
    const executive = await User.findOne({ role: 'Executive User' });
    const admin = await User.findOne({ role: 'Super CRM Administrator' });
    const salesManager = await User.findOne({ role: 'Sales Manager' });
    const marketingManager = await User.findOne({ role: 'Marketing Manager' });
    const supportManager = await User.findOne({ role: 'Customer Support Manager' });
    
    const salesAgents = await User.find({ role: 'Sales Agent' });
    const supportAgents = await User.find({ role: 'Customer Support Agent' });
    const techUsers = await User.find({ role: { $in: ['CRM Developer', 'CRM Consultant', 'System Architect'] } });

    if (!salesAgents.length || !supportAgents.length || !techUsers.length) {
      console.log('❌ No agents or Technology users found. Please create users first.');
      process.exit(1);
    }

    console.log('Creating campaigns...');
    
    const campaign1 = await Campaign.create({
      name: 'Spring Sale 2024',
      platform: 'Meta',
      budget: 5000,
      status: 'Active',
      startDate: new Date('2024-03-01'),
      endDate: new Date('2024-03-31'),
      manager: marketingManager?._id || admin._id
    });

    const campaign2 = await Campaign.create({
      name: 'Google Search Ads Q1',
      platform: 'Google',
      budget: 8000,
      status: 'Active',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-03-31'),
      manager: marketingManager?._id || admin._id
    });

    const campaign3 = await Campaign.create({
      name: 'Facebook Lead Gen',
      platform: 'Meta',
      budget: 3000,
      status: 'Active',
      startDate: new Date('2024-02-15'),
      endDate: new Date('2024-04-15'),
      manager: marketingManager?._id || admin._id
    });

    const campaign4 = await Campaign.create({
      name: 'LinkedIn B2B Campaign',
      platform: 'Other',
      budget: 6000,
      status: 'Completed',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-02-28'),
      manager: marketingManager?._id || admin._id
    });

    console.log('Creating leads...');
    
    const leadStatuses = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Converted', 'Lost'];
    const leadSources = ['Meta', 'Google', 'Other'];
    
    const leadData = [
      'John Smith', 'Sarah Williams', 'Michael Jones', 'Emma Taylor', 'Daniel Anderson',
      'Olivia Martinez', 'James Garcia', 'Sophia Rodriguez', 'William Wilson', 'Isabella Lopez',
      'Robert Hernandez', 'Mia Gonzalez', 'David Perez', 'Charlotte Moore', 'Joseph Martin',
      'Amelia Jackson', 'Thomas Thompson', 'Harper White', 'Charles Harris', 'Evelyn Clark',
      'Christopher Lewis', 'Abigail Walker', 'Matthew Hall', 'Emily Allen', 'Anthony Young'
    ];

    const leads = [];
    for (let i = 0; i < leadData.length; i++) {
      const name = leadData[i];
      const status = leadStatuses[i % leadStatuses.length];
      const source = leadSources[i % leadSources.length];
      const campaign = source === 'Meta' ? campaign1._id : source === 'Google' ? campaign2._id : null;
      const firstName = name.split(' ')[0].toLowerCase();
      const lastName = name.split(' ')[1].toLowerCase();
      
      leads.push({
        name: name,
        email: `${firstName}.${lastName}@example.com`,
        phone: `+1-555-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        source: source,
        status: status,
        assignedTo: salesAgents[i % salesAgents.length]._id,
        campaign: campaign,
        notes: `Lead from ${source} source. Interested in our products.`
      });
    }

    const createdLeads = await Lead.insertMany(leads);

    console.log('Creating tickets...');
    
    const ticketSubjects = [
      'Login issues with dashboard',
      'Feature request: Export data',
      'Bug: Reports not generating',
      'Question about pricing',
      'Account upgrade needed',
      'Integration with third-party tools',
      'Performance issue on mobile app',
      'Payment processing error',
      'Data synchronization problem',
      'API documentation request',
      'User permissions not working',
      'Dashboard loading slowly',
      'Email notifications not received',
      'Custom field configuration help',
      'Training session request'
    ];

    const tickets = [];
    const ticketStatuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
    const priorities = ['Low', 'Medium', 'High', 'Urgent'];

    for (let i = 0; i < ticketSubjects.length; i++) {
      tickets.push({
        subject: ticketSubjects[i],
        description: `Detailed description for: ${ticketSubjects[i]}. Internal team reported this system issue to Technology.`,
        status: ticketStatuses[i % ticketStatuses.length],
        priority: priorities[i % priorities.length],
        affectedPage: 'Other',
        requesterTeam: supportAgents[i % supportAgents.length].role,
        targetTeam: 'Technology Team',
        assignedTo: techUsers[i % techUsers.length]._id,
        createdBy: supportAgents[i % supportAgents.length]._id
      });
    }

    await Ticket.insertMany(tickets);

    console.log('✅ Database seeded successfully!');
    console.log(`Created: ${createdLeads.length} leads, ${tickets.length} tickets, 4 campaigns`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
