/**
 * essController.js
 * Employee Self-Service (ESS) — private, per-user views.
 * Every query is forced to the authenticated user via req.scopeEmployeeId
 * (set by the enforceSelfScope middleware), so cross-user access is impossible.
 */
const PayrollEntry = require('../models/PayrollEntry');
const AuxSchedule = require('../models/AuxSchedule');
const User = require('../models/User');
const AuxLog = require('../models/AuxLog');

// ─── MY SCHEDULE ─────────────────────────────────────────────────
exports.getMySchedule = async (req, res) => {
  try {
    const { month } = req.query; // "YYYY-MM"
    const employeeId = req.scopeEmployeeId;

    const profile = await User.findById(employeeId).select(
      'firstName lastName role department shift weeklyOffDays auxStatus'
    );

    // Today's AUX live status (reuse AuxLog)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const logs = await AuxLog.find({
      userId: employeeId,
      startedAt: { $gte: todayStart },
    }).sort({ startedAt: 1 });

    const todayStats = { Live: 0, Break: 0, Training: 0, Coaching: 0, 'Logged out': 0 };
    let activeStatusSince = null;
    logs.forEach(l => {
      if (l.endedAt === null) activeStatusSince = l.startedAt;
      const mins = l.durationMinutes ?? Math.round((Date.now() - l.startedAt) / 60000);
      todayStats[l.status] = (todayStats[l.status] || 0) + mins;
    });

    const query = { userId: employeeId };
    if (month) query.month = month;
    const schedules = await AuxSchedule.find(query)
      .populate('userId', 'firstName lastName role department shift weeklyOffDays')
      .sort({ month: -1 });

    res.json({
      success: true,
      data: {
        profile,
        auxStatus: profile?.auxStatus || 'Logged out',
        activeStatusSince,
        todayStats,
        schedules,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── MY PAYSLIPS (list + detail) ────────────────────────────────
exports.getMyPayslips = async (req, res) => {
  try {
    const entries = await PayrollEntry.find({ employeeId: req.scopeEmployeeId })
      .populate('runId', 'period status approvedAt releasedAt paymentDate')
      .sort({ period: -1 })
      .limit(36);
    res.json({ success: true, data: entries });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getMyPayslipById = async (req, res) => {
  try {
    const entry = await PayrollEntry.findOne({
      _id: req.params.id,
      employeeId: req.scopeEmployeeId, // cannot fetch another user's payslip
    }).populate('runId', 'period status approvedAt releasedAt paymentDate');
    if (!entry) return res.status(404).json({ message: 'Payslip not found' });
    res.json({ success: true, data: entry });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── MY PAYMENT HISTORY ─────────────────────────────────────────
exports.getMyPaymentHistory = async (req, res) => {
  try {
    const entries = await PayrollEntry.find({
      employeeId: req.scopeEmployeeId,
      status: { $in: ['Paid', 'Approved'] },
    })
      .populate('runId', 'period status paymentDate paymentRef')
      .sort({ period: -1 });

    const history = entries.map(e => ({
      _id: e._id,
      period: e.period,
      grossEarnings: e.grossEarnings,
      totalDeductions: e.totalDeductions,
      netSalary: e.netSalary,
      status: e.status,
      paymentDate: e.paymentDate,
      paymentRef: e.paymentRef,
    }));

    const totals = history.reduce(
      (acc, h) => {
        acc.gross += h.grossEarnings || 0;
        acc.deductions += h.totalDeductions || 0;
        acc.net += h.netSalary || 0;
        return acc;
      },
      { gross: 0, deductions: 0, net: 0 }
    );

    const ytd = history
      .filter(h => h.period && h.period >= new Date().toISOString().slice(0, 4))
      .reduce((s, h) => s + (h.netSalary || 0), 0);

    res.json({
      success: true,
      data: { history, totals, ytdNet: ytd, count: history.length },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
