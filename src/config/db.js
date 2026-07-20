const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Drop the old unique index on { period: 1 } if it still exists.
    // The new partial index only enforces uniqueness for Salary runs.
    try {
      await conn.connection.collection('payrollruns').dropIndex('period_1');
      console.log('Dropped legacy payrollruns period_1 index.');
    } catch (_) {
      // Index doesn't exist — nothing to do
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
