const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
      console.warn('MONGODB_URI not set - database features will be unavailable');
      return null;
    }
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    try {
      await conn.connection.collection('payrollruns').dropIndex('period_1');
      console.log('Dropped legacy payrollruns period_1 index.');
    } catch (_) {
      // Index doesn't exist — nothing to do
    }
    return conn;
  } catch (error) {
    console.error(`Database connection error: ${error.message}`);
    console.warn('Continuing without database - some features may be unavailable');
    return null;
  }
};

module.exports = connectDB;
