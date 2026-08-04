/**
 * Migration Script: Rename old role names to new Core 360 names
 * Run once with: node scripts/migrateRoles.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const ROLE_MAP = {
  'Super CRM Administrator': 'Core 360 Administrator',
  'Super ERP Administrator': 'Core 360 Administrator',
};

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const users = db.collection('users');

  let totalUpdated = 0;

  for (const [oldRole, newRole] of Object.entries(ROLE_MAP)) {
    const result = await users.updateMany(
      { role: oldRole },
      { $set: { role: newRole } }
    );
    if (result.modifiedCount > 0) {
      console.log(`✅ Updated ${result.modifiedCount} user(s): "${oldRole}" → "${newRole}"`);
      totalUpdated += result.modifiedCount;
    } else {
      console.log(`ℹ️  No users found with role: "${oldRole}"`);
    }
  }

  console.log(`\nDone. ${totalUpdated} total user(s) updated.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
