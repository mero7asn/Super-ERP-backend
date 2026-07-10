/**
 * vendorConfig.js
 * ----------------------------------------------------------------------------
 * Declarative description of each payment-gateway VENDOR and the employee-side
 * details it requires when a bank account is added.
 *
 * This is the single source of truth shared by:
 *   - backend validation (saveBankAccount) so each vendor's required fields
 *     are enforced (Fawry needs X, PayMob needs Y, InstaPay needs IBAN, ...)
 *   - the frontend, which renders a dynamic form from `GET /api/gateway/vendors`
 *
 * `methods`  = disbursement methods the vendor supports for payroll
 * `fields`   = per-method required/optional employee fields
 *   required: true  -> must be provided for this vendor+method
 *   (accountNumber/iban use the `eitherOf` rule below)
 * ----------------------------------------------------------------------------
 */

const VENDOR_CAPABILITIES = {
  Fawry: {
    label: 'Fawry',
    description: 'Egyptian disbursement network — bank account or Fawry mobile wallet.',
    methods: ['BankAccount', 'FawryWallet'],
    fields: {
      BankAccount: {
        accountName: { required: true },
        bankName:    { required: true },
        accountNumber: { required: false, eitherOf: 'iban' },
        iban:        { required: false, eitherOf: 'accountNumber' },
        swiftCode:   { required: false },
        branchCode:  { required: false },
      },
      FawryWallet: {
        accountName: { required: true },
        fawryMobile: { required: true },
      },
    },
  },
  PayMob: {
    label: 'PayMob',
    description: 'PayMob Payouts — bank account or PayMob wallet.',
    methods: ['BankAccount', 'PayMobWallet'],
    fields: {
      BankAccount: {
        accountName: { required: true },
        bankName:    { required: true },
        accountNumber: { required: false, eitherOf: 'iban' },
        iban:        { required: false, eitherOf: 'accountNumber' },
        swiftCode:   { required: false },
      },
      PayMobWallet: {
        accountName: { required: true },
        paymobWallet: { required: true },
      },
    },
  },
  InstaPay: {
    label: 'InstaPay (IPN)',
    description: 'Egyptian instant bank transfer via IBAN (debtor = company account).',
    methods: ['BankAccount'],
    fields: {
      BankAccount: {
        accountName: { required: true },
        bankName:    { required: true },
        iban:        { required: true },
        accountNumber: { required: false },
        swiftCode:   { required: false },
      },
    },
  },
  BankAPI: {
    label: 'Bank API (Direct)',
    description: 'Direct corporate bank API (CBE / NBE / QNB / CIB). Requires bank agreement.',
    methods: ['BankAccount'],
    fields: {
      BankAccount: {
        accountName: { required: true },
        bankName:    { required: true },
        accountNumber: { required: false, eitherOf: 'iban' },
        iban:        { required: false, eitherOf: 'accountNumber' },
        swiftCode:   { required: false },
        branchCode:  { required: false },
      },
    },
  },
  Amazon: {
    label: 'Amazon Pay',
    description: 'Example of an extensible "other gateway". Bank-account method; live payout requires custom integration.',
    methods: ['BankAccount'],
    fields: {
      BankAccount: {
        accountName: { required: true },
        bankName:    { required: true },
        accountNumber: { required: true },
        iban:        { required: false },
      },
    },
  },
};

const VENDOR_LABELS = Object.fromEntries(
  Object.entries(VENDOR_CAPABILITIES).map(([k, v]) => [k, v.label])
);

/**
 * Validate an employee bank account payload against the selected vendor + method.
 * @returns {string[]} list of human-readable errors (empty = valid)
 */
const validateBankAccount = ({ vendor, method, data = {} }) => {
  const cap = VENDOR_CAPABILITIES[vendor];
  if (!cap) return [`Unknown vendor "${vendor}".`];
  if (!cap.methods.includes(method)) {
    return [`Vendor ${cap.label} does not support disbursement method "${method}".`];
  }
  const rules = cap.fields[method] || {};
  const errors = [];

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];
    const present = value !== undefined && value !== null && String(value).trim() !== '';

    if (rule.eitherOf) {
      const other = data[rule.eitherOf];
      const otherPresent = other !== undefined && other !== null && String(other).trim() !== '';
      if (!present && !otherPresent) {
        errors.push(`Either ${field} or ${rule.eitherOf} is required for ${cap.label} (${method}).`);
      }
      continue;
    }
    if (rule.required && !present) {
      errors.push(`${field} is required for ${cap.label} (${method}).`);
    }
  }
  return errors;
};

module.exports = { VENDOR_CAPABILITIES, VENDOR_LABELS, validateBankAccount };
