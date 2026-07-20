const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
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

// Belt-and-suspenders manual CORS preflight handler. This guarantees the
// Access-Control-Allow-* headers are returned on OPTIONS even if the `cors`
// package is not bundled in the deployed serverless function.
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

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
const productRoutes = require('./routes/productRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');

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
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);

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

    // ── Inventory: daily expiry scan (6:00 AM) ──────────────────────────────
    cron.schedule('0 6 * * *', async () => {
      try {
        const Lot = require('./models/Lot');
        const Email = require('./models/Email');
        const User = require('./models/User');
        const now = new Date();
        const horizon30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        // Block lots that are past expiry
        const expired = await Lot.updateMany(
          { expiryDate: { $lte: now }, status: 'Unrestricted', quantity: { $gt: 0 } },
          { $set: { status: 'Blocked' } }
        );
        if (expired.modifiedCount > 0) {
          console.log(`[Cron:Inventory] Blocked ${expired.modifiedCount} expired lot(s)`);
        }

        // Notify inventory managers about lots expiring within 30 days
        const expiringLots = await Lot.find({
          expiryDate: { $gt: now, $lte: horizon30 },
          status: 'Unrestricted',
          quantity: { $gt: 0 }
        }).populate('item', 'sku name').populate('warehouse', 'code name');

        if (expiringLots.length > 0) {
          const managers = await User.find({ role: { $in: ['Inventory Manager', 'Warehouse Manager', 'Super CRM Administrator'] }, isActive: true });
          for (const mgr of managers) {
            const lotList = expiringLots.slice(0, 15).map(l =>
              `- Lot ${l.lotNumber} | ${l.item?.sku} ${l.item?.name} | Qty: ${l.quantity} | Expires: ${new Date(l.expiryDate).toLocaleDateString()} | ${l.warehouse?.code}`
            ).join('\n');
            await Email.create({
              senderId: mgr._id,
              recipientId: mgr._id,
              subject: `[Inventory Alert] ${expiringLots.length} lot(s) expiring within 30 days`,
              body: `Dear ${mgr.firstName},\n\nThe following lots are expiring within 30 days:\n\n${lotList}${expiringLots.length > 15 ? `\n...and ${expiringLots.length - 15} more.` : ''}\n\nPlease review and take action.\n\nBest regards,\nInventory System`
            });
          }
          console.log(`[Cron:Inventory] Sent expiry alerts for ${expiringLots.length} lot(s) to ${managers.length} manager(s)`);
        }
      } catch (err) {
        console.error('[Cron:Inventory] Expiry scan error:', err.message);
      }
    });
    console.log('[Cron] Daily inventory expiry scan registered (6:00 AM)');

    // ── Inventory: reorder point breach check (every 4 hours) ───────────────
    cron.schedule('0 */4 * * *', async () => {
      try {
        const StockLevel = require('./models/StockLevel');
        const InventoryItem = require('./models/InventoryItem');
        const Email = require('./models/Email');
        const User = require('./models/User');

        const breachedItems = await StockLevel.aggregate([
          { $group: { _id: '$item', totalAvailable: { $sum: '$available' } } },
          { $lookup: { from: 'inventoryitems', localField: '_id', foreignField: '_id', as: 'itemData' } },
          { $unwind: { path: '$itemData', preserveNullAndEmpty: false } },
          {
            $match: {
              'itemData.reorderPoint': { $gt: 0 },
              $expr: { $lte: ['$totalAvailable', '$itemData.reorderPoint'] }
            }
          },
          {
            $project: {
              sku: '$itemData.sku',
              name: '$itemData.name',
              reorderPoint: '$itemData.reorderPoint',
              totalAvailable: 1
            }
          },
          { $sort: { totalAvailable: 1 } }
        ]);

        if (breachedItems.length > 0) {
          const managers = await User.find({ role: { $in: ['Inventory Manager', 'Super CRM Administrator'] }, isActive: true });
          for (const mgr of managers) {
            const itemList = breachedItems.slice(0, 20).map(i =>
              `- ${i.sku} ${i.name} | Available: ${i.totalAvailable} | Reorder Point: ${i.reorderPoint}`
            ).join('\n');
            await Email.create({
              senderId: mgr._id,
              recipientId: mgr._id,
              subject: `[Inventory Alert] ${breachedItems.length} item(s) below reorder point`,
              body: `Dear ${mgr.firstName},\n\nThe following items have stock at or below their reorder point:\n\n${itemList}${breachedItems.length > 20 ? `\n...and ${breachedItems.length - 20} more.` : ''}\n\nPlease initiate replenishment orders.\n\nBest regards,\nInventory System`
            });
          }
          console.log(`[Cron:Inventory] Sent reorder alerts for ${breachedItems.length} item(s)`);
        }
      } catch (err) {
        console.error('[Cron:Inventory] Reorder breach check error:', err.message);
      }
    });
    console.log('[Cron] Inventory reorder breach check registered (every 4 hours)');

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
