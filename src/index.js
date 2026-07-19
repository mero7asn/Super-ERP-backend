const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

const app = express();

// Manual OPTIONS preflight handler registered FIRST so it returns 204 with
// CORS headers without depending on the cors package for preflight.
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    );
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return res.sendStatus(204);
  }
  next();
});

// Connect to database (truly non-blocking on failure so CORS preflight still works)
let dbConnected = false;
try {
  const dbPromise = connectDB();
  if (dbPromise && typeof dbPromise.then === 'function') {
    dbPromise
      .then(connected => {
        dbConnected = Boolean(connected);
      })
      .catch(err => {
        console.error('Unexpected error during DB connection:', err);
      });
  }
} catch (err) {
  console.error('Unexpected error initiating DB connection:', err);
}

// Body parser
app.use(express.json());

// Enable CORS for normal (non-preflight) requests
const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.options('/*splat', cors(corsOptions));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

// Health check / DB availability gate (preflight already handled above)
app.use((req, res, next) => {
  if (!dbConnected) {
    return res.status(503).json({ message: 'Service unavailable: database connection failed' });
  }
  next();
});

// Mount routers
const authRoutes = require('./routes/authRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const leadRoutes = require('./routes/leadRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const publicRoutes = require('./routes/publicRoutes');
const offerRoutes = require('./routes/offerRoutes');
const hrmRoutes = require('./routes/hrmRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const essRoutes = require('./routes/essRoutes');
const gatewayRoutes = require('./routes/gatewayRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/hrm', hrmRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/ess', essRoutes);
app.use('/api/gateway', gatewayRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/public/pay', paymentRoutes);
app.use('/api/bookings', bookingRoutes);

// Base route
app.get('/', (req, res) => {
  res.send('CRM Backend API is running...');
});

// Run-on-startup tasks. On Vercel (serverless) app.listen() never fires,
// so these are triggered eagerly here instead of inside a listen callback.
const runStartupTasks = () => {
  try {
    // Clean up stale recordLocator unique index from prior schema (Offer creation blocker)
    const Offer = require('./models/Offer');
    if (Offer.collection) {
      const cleanupIndex = async () => {
        const cursor = Offer.collection.listIndexes();
        const indexes = typeof cursor.toArray === 'function' ? await cursor.toArray() : await cursor;
        const hasBadIndex = Array.isArray(indexes) && indexes.some(idx => idx.name === 'recordLocator_1');
        if (hasBadIndex) {
          console.log('[Startup] Dropping stale recordLocator_1 index...');
          return Offer.collection.dropIndex('recordLocator_1');
        }
        return Promise.resolve();
      };
      cleanupIndex().catch(err => {
        if (err.code !== 27 && err.code !== 26) {
          console.error('[Startup] Index cleanup error:', err.message);
        }
      });
    }

    // Set up periodic check for expired campaigns (every 5 minutes)
    const { updateExpiredCampaigns } = require('./services/campaignHelper');
    updateExpiredCampaigns();
    setInterval(updateExpiredCampaigns, 5 * 60 * 1000);

    // Monthly schedule reminder: on the 25th of every month at 9:00 AM
    cron.schedule('0 9 25 * *', async () => {
      try {
        console.log('[Cron] Running monthly schedule reminder job...');
        const User = require('./models/User');
        const DetailedSchedule = require('./models/DetailedSchedule');
        const Email = require('./models/Email');

        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth() + 1;
        const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;

        const employees = await User.find({ isActive: true });
        let count = 0;

        for (const emp of employees) {
          const existing = await DetailedSchedule.findOne({ employeeId: emp._id, month: nextMonth });
          if (!existing) {
            await Email.create({
              senderId: emp._id,
              recipientId: emp._id,
              subject: `Reminder: Please set your schedule for ${nextMonth}`,
              body: `Dear ${emp.firstName},\n\nPlease set your work schedule for ${nextMonth} before the month starts.\n\nGo to Personal Department > Profile & Schedule to update your schedule.\n\nBest regards,\nHR Department`
            });
            count++;
          }
        }
        console.log(`[Cron] Sent ${count} schedule reminders for ${nextMonth}`);
      } catch (err) {
        console.error('[Cron] Schedule reminder error:', err);
      }
    });
    console.log('[Cron] Monthly schedule reminder job registered (25th of each month, 9:00 AM)');

    // Hourly offer expiry: mark Sent/Viewed offers past their validUntil as Expired
    cron.schedule('0 * * * *', async () => {
      try {
        const Offer = require('./models/Offer');
        const now = new Date();
        const result = await Offer.updateMany(
          {
            status: { $in: ['Sent', 'Viewed'] },
            validUntil: { $lt: now }
          },
          { $set: { status: 'Expired' } }
        );
        if (result.modifiedCount > 0) {
          console.log(`[Cron] Expired ${result.modifiedCount} overdue offer(s)`);
        }
      } catch (err) {
        console.error('[Cron] Offer expiry error:', err.message);
      }
    });
    console.log('[Cron] Hourly offer expiry job registered');
  } catch (err) {
    console.error('[Startup] Error running startup tasks:', err.message);
  }
};
try {
  runStartupTasks();
} catch (err) {
  console.error('[Startup] Unexpected error invoking startup tasks:', err.message);
}

// Export for serverless (Vercel @vercel/node). On Vercel the module is invoked
// per-request; app.listen is not used. Keep listen only for local `npm start`.
if (require.main === module) {
  try {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('[Startup] Error starting local server:', err.message);
  }
}

module.exports = app;
