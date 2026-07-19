const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
let cron = null;
try {
  cron = require('node-cron');
} catch (err) {
  console.error('[Startup] node-cron not available, scheduled jobs disabled:', err.message);
}
const connectDB = require('./config/db');

dotenv.config();

connectDB().catch(err => {
  console.error('Unexpected error during DB connection:', err);
});

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('/*splat', cors());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

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

app.get('/', (req, res) => {
  res.send('CRM Backend API is running...');
});

const runStartupTasks = () => {
  try {
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

    const { updateExpiredCampaigns } = require('./services/campaignHelper');
    updateExpiredCampaigns();
    setInterval(updateExpiredCampaigns, 5 * 60 * 1000);

    if (cron) {
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
                body: `Dear ${emp.firstName},\n\nPlease set your schedule for ${nextMonth} before the month starts.\n\nGo to Personal Department > Profile & Schedule to update your schedule.\n\nBest regards,\nHR Department`
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
    } else {
      console.log('[Cron] Skipping monthly schedule reminder job (node-cron unavailable)');
    }

    if (cron) {
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
    } else {
      console.log('[Cron] Skipping hourly offer expiry job (node-cron unavailable)');
    }

  } catch (err) {
    console.error('[Startup] Error running startup tasks:', err.message);
  }
};
runStartupTasks();

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
