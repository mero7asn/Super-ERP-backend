const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
      console.error('MongoDB URI is not configured');
      return false;
    }
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    try {
      await conn.connection.collection('payrollruns').dropIndex('period_1');
      console.log('Dropped legacy payrollruns period_1 index.');
    } catch (_) {
      // Index doesn't exist — nothing to do
    }
    return true;
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    return false;
  }
};

module.exports = connectDB;
