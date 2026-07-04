const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const User = require('../src/models/User');

const fixHierarchy = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const executiveUser = await User.findOne({ role: 'Executive User' });
    const superAdmin = await User.findOne({ role: 'Super CRM Administrator' });
    
    if (!executiveUser || !superAdmin) {
      console.log('Key users not found');
      return;
    }

    console.log(`Executive User: ${executiveUser.firstName} ${executiveUser.lastName}`);
    console.log(`Super CRM Administrator: ${superAdmin.firstName} ${superAdmin.lastName}`);

    const managerRoles = ['Sales Manager', 'Customer Support Manager', 'Marketing Manager', 'System Architect'];
    await User.updateMany(
      { role: { $in: managerRoles } },
      { supervisor: superAdmin._id }
    );
    console.log(`\nUpdated managers to report to Super CRM Administrator`);

    await User.updateMany(
      { role: { $in: ['Super CRM Administrator', 'Business Analyst'] } },
      { supervisor: executiveUser._id }
    );
    console.log('Updated top-level users to report to Executive User');

    await User.updateOne({ role: 'Executive User' }, { supervisor: null });
    console.log('Cleared Executive User supervisor');

    console.log('\n=== FINAL HIERARCHY ===');
    const allUsers = await User.find({}).populate('supervisor', 'firstName lastName role').sort({ role: 1 });
    allUsers.forEach(u => {
      const sup = u.supervisor ? `${u.supervisor.firstName} ${u.supervisor.lastName} (${u.supervisor.role})` : '—';
      console.log(`${u.firstName} ${u.lastName} (${u.role}) → ${sup}`);
    });

    await mongoose.connection.close();
    console.log('\nDone!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

fixHierarchy();
