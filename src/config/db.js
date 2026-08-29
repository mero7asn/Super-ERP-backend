const mongoose = require('mongoose');

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.warn('MONGODB_URI / MONGO_URI not set - database features will be unavailable');
    return null;
  }

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    };

    cached.promise = mongoose.connect(uri, opts).then(async (mongooseInstance) => {
      console.log(`MongoDB Connected: ${mongooseInstance.connection.host}`);
      try {
        await mongooseInstance.connection.collection('payrollruns').dropIndex('period_1');
      } catch (_) {
        // Index does not exist
      }
      return mongooseInstance;
    }).catch(err => {
      cached.promise = null;
      console.error('Database connection error:', err.message);
      return null;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (e) {
    cached.promise = null;
    console.error('Failed to establish DB connection:', e.message);
    return null;
  }
};

module.exports = connectDB;
