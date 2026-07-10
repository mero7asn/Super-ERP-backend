const PaymentMethod = require('../models/PaymentMethod');

const PAYROLL_ROLES = [
  'Payroll Specialist', 'HR Manager', 'HR Director / Executive HR User',
  'HRM System Administrator', 'Super CRM Administrator',
];
const isPayrollMgr = (role) => PAYROLL_ROLES.includes(role);

const validateCard = (cardNumber, expiryMonth, expiryYear) => {
  const cleaned = cardNumber.replace(/\s/g, '');
  if (!/^\d{13,19}$/.test(cleaned)) return 'Card number must be 13–19 digits.';

  const month = parseInt(expiryMonth, 10);
  const year  = parseInt(expiryYear, 10);
  if (!month || month < 1 || month > 12) return 'Expiry month must be between 01 and 12.';
  if (!year || year < 1000 || year > 9999) return 'Expiry year must be a 4-digit year.';

  const now = new Date();
  const expiry = new Date(year, month - 1, 1); // first day of expiry month
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  if (expiry < firstOfThisMonth) return 'Card has already expired.';

  return null; // valid
};

// ── ESS: Submit a new payment method ─────────────────────────────
exports.submitPaymentMethod = async (req, res) => {
  try {
    const { cardholderName, cardType, cardNumber, expiryMonth, expiryYear } = req.body;
    if (!cardholderName || !cardType || !cardNumber || !expiryMonth || !expiryYear)
      return res.status(400).json({ message: 'All card fields are required.' });

    const err = validateCard(cardNumber, expiryMonth, expiryYear);
    if (err) return res.status(400).json({ message: err });

    const cleaned = cardNumber.replace(/\s/g, '');
    const lastFour = cleaned.slice(-4);
    const cardToken = '*'.repeat(cleaned.length - 4) + lastFour;

    await PaymentMethod.updateMany({ employeeId: req.user._id, isActive: true }, { isActive: false });

    const pm = await PaymentMethod.create({
      employeeId: req.user._id,
      cardholderName, cardType,
      lastFour, cardToken,
      cardLength: cleaned.length,
      expiryMonth, expiryYear,
    });

    res.status(201).json({ success: true, data: pm });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ── ESS: Update (edit) a payment method — resets to Pending ──────
exports.updatePaymentMethod = async (req, res) => {
  try {
    const pm = await PaymentMethod.findOne({ _id: req.params.id, employeeId: req.user._id });
    if (!pm) return res.status(404).json({ message: 'Not found.' });

    const { cardholderName, cardType, cardNumber, expiryMonth, expiryYear } = req.body;
    if (!cardholderName || !cardType || !cardNumber || !expiryMonth || !expiryYear)
      return res.status(400).json({ message: 'All card fields are required.' });

    const err = validateCard(cardNumber, expiryMonth, expiryYear);
    if (err) return res.status(400).json({ message: err });

    const cleaned = cardNumber.replace(/\s/g, '');
    const lastFour = cleaned.slice(-4);
    const cardToken = '*'.repeat(cleaned.length - 4) + lastFour;

    pm.cardholderName = cardholderName;
    pm.cardType       = cardType;
    pm.lastFour       = lastFour;
    pm.cardToken      = cardToken;
    pm.cardLength     = cleaned.length;
    pm.expiryMonth    = expiryMonth;
    pm.expiryYear     = expiryYear;
    // Reset to Pending for re-review
    pm.status         = 'Pending';
    pm.isActive       = false;
    pm.reviewedBy     = null;
    pm.reviewedAt     = null;
    pm.rejectionReason = '';
    await pm.save();

    res.json({ success: true, data: pm });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ── ESS: Get own payment methods ──────────────────────────────────
exports.getMyPaymentMethods = async (req, res) => {
  try {
    const methods = await PaymentMethod.find({ employeeId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: methods });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ── ESS: Delete a pending payment method ─────────────────────────
exports.deletePaymentMethod = async (req, res) => {
  try {
    const pm = await PaymentMethod.findOne({ _id: req.params.id, employeeId: req.user._id });
    if (!pm) return res.status(404).json({ message: 'Not found.' });
    if (pm.status !== 'Pending') return res.status(400).json({ message: 'Only pending cards can be removed.' });
    await pm.deleteOne();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ── Manager: List all payment methods (pending first) ────────────
exports.getAllPaymentMethods = async (req, res) => {
  try {
    if (!isPayrollMgr(req.user?.role))
      return res.status(403).json({ message: 'Access denied.' });

    const { status } = req.query;
    const filter = status && status !== 'All' ? { status } : {};
    const methods = await PaymentMethod.find(filter)
      .populate('employeeId', 'firstName lastName role department')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ status: 1, createdAt: -1 });

    res.json({ success: true, data: methods });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ── Manager: Approve ──────────────────────────────────────────────
exports.approvePaymentMethod = async (req, res) => {
  try {
    if (!isPayrollMgr(req.user?.role))
      return res.status(403).json({ message: 'Access denied.' });

    const pm = await PaymentMethod.findById(req.params.id);
    if (!pm) return res.status(404).json({ message: 'Not found.' });

    // Deactivate other approved cards for this employee
    await PaymentMethod.updateMany(
      { employeeId: pm.employeeId, isActive: true },
      { isActive: false }
    );

    pm.status = 'Approved';
    pm.isActive = true;
    pm.reviewedBy = req.user._id;
    pm.reviewedAt = new Date();
    await pm.save();

    res.json({ success: true, data: pm });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ── Manager: Reject ───────────────────────────────────────────────
exports.rejectPaymentMethod = async (req, res) => {
  try {
    if (!isPayrollMgr(req.user?.role))
      return res.status(403).json({ message: 'Access denied.' });

    const pm = await PaymentMethod.findById(req.params.id);
    if (!pm) return res.status(404).json({ message: 'Not found.' });

    pm.status = 'Rejected';
    pm.isActive = false;
    pm.reviewedBy = req.user._id;
    pm.reviewedAt = new Date();
    pm.rejectionReason = req.body.reason || '';
    await pm.save();

    res.json({ success: true, data: pm });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
