const mongoose = require("mongoose");

// ========================
//  CONSTANTS & VALIDATIONS
// ========================
const accountTypes = [
  "Bank & Cash",
  "Current Asset",
  "Depreciation",
  "Fixed Asset",
  "Inventory",
  "Non-current Asset",
  "Prepayment",
  "Equity",
  "Revenue",
  "Expense",
  "Direct Costs",
  "Income",
  "Sales Revenue", // Standardized to Title Case
  "Direct Expense",
  "Current Liability",
  "Liability",
  "Non-current Liability",
];

const accountCategories = ["Assets", "Liabilities", "Equity", "Expenses", "Income"];
const taxTypes = ["VAT", "GST", "Sales Tax", "None"];
const depreciationMethods = ["Straight-Line", "Declining Balance", "None"];

// ========================
//  SCHEMA DEFINITION
// ========================
const AccountSchema = new mongoose.Schema({
  // Core Fields
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, match: /^[0-9]{4,6}$/ }, // e.g., "1200"
  type: { type: String, required: true, enum: accountTypes },
  category: { type: String, required: true, enum: accountCategories },
  balance: { type: Number, default: 0 },
  description: { type: String, default: "" },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  createdAt: { type: Date, default: Date.now },

  // Hierarchy & Relationships
  parentAccount: { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null },
  isContraAccount: { type: Boolean, default: false },
  depth: { type: Number, default: 0 },

  // Tax Configuration
  taxApplicable: { type: Boolean, default: false },
  taxRate: { type: Number, default: 0, min: 0, max: 100 }, // e.g., 5%
  taxType: { type: String, enum: taxTypes, default: "None" },

  // Multi-Currency Support
  currency: { type: String, default: "OMR", uppercase: true },
  balances: {
    OMR: { type: Number, default: 0 },
    USD: { type: Number, default: 0 },
    EUR: { type: Number, default: 0 },
  },

  // Budgeting & Forecasting
  budget: {
    monthly: { type: Number, default: 0 },
    yearly: { type: Number, default: 0 },
  },
  actualVsBudget: [{
    date: { type: Date, default: Date.now },
    actual: { type: Number },
    budget: { type: Number },
    variance: { type: Number }, // actual - budget
  }],

  // Fixed Asset Depreciation
  depreciation: {
    method: { type: String, enum: depreciationMethods, default: "None" },
    usefulLifeYears: { type: Number, default: 0 },
    salvageValue: { type: Number, default: 0 },
    monthlyExpense: { type: Number, default: 0 }, // Auto-calculated
  },

  // Security & Workflow
  requiresApproval: { type: Boolean, default: false },
  approvals: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    timestamp: { type: Date, default: Date.now },
  }],
  fiscalYearLock: { type: Boolean, default: false },

  // Audit & Integration
  balanceHistory: [{
    date: { type: Date, default: Date.now },
    balance: { type: Number },
    currency: { type: String },
  }],
  auditLog: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: { type: String, enum: ["Create", "Update", "Delete", "Adjustment"] },
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now },
  }],
  externalId: { type: String }, // For ERP integration
});

// ========================
//  INDEXES (For Performance)
// ========================
AccountSchema.index({ code: 1, parentAccount: 1, category: 1 });
AccountSchema.index({ status: 1, type: 1 });

// ========================
//  MIDDLEWARE & VALIDATIONS
// ========================
AccountSchema.pre("save", async function (next) {
  // --- Parent-Child Validations ---
  if (this.parentAccount) {
    const parent = await mongoose.model("Account").findById(this.parentAccount);
    if (!parent) throw new Error("Parent account not found");

    // Code inheritance (e.g., parent "1200" → child "1201")
    if (!this.code.startsWith(parent.code)) {
      throw new Error(`Child account code must inherit from parent (e.g., ${parent.code} → ${parent.code}1)`);
    }

    // Category consistency
    if (this.category !== parent.category) {
      throw new Error(`Parent (${parent.category}) and child (${this.category}) categories must match`);
    }

    // Depth limit (max 3 levels)
    this.depth = parent.depth + 1;
    if (this.depth > 3) throw new Error("Account hierarchy cannot exceed 3 levels");
  }

  // --- Contra-Account Rules ---
  if (this.isContraAccount) {
    if (this.category === "Assets" && this.type !== "Depreciation") {
      throw new Error("Contra-assets must be of type 'Depreciation'");
    }
    if (this.category === "Income" && !["Sales Returns", "Discounts"].includes(this.type)) {
      throw new Error("Contra-income accounts must track refunds/discounts");
    }
  }

  // --- Depreciation Calculation ---
  if (this.type === "Fixed Asset" && this.depreciation.method !== "None") {
    const annualDepr = (this.balance - this.depreciation.salvageValue) / this.depreciation.usefulLifeYears;
    this.depreciation.monthlyExpense = annualDepr / 12;
  }

  // --- Budget Variance ---
  if (this.isModified("balance") || this.isModified("budget")) {
    this.actualVsBudget.push({
      actual: this.balance,
      budget: this.budget.yearly,
      variance: this.balance - this.budget.yearly,
    });
  }

  next();
});

// ========================
//  STATIC METHODS
// ========================
AccountSchema.statics.updateBalances = async function (journalEntry) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bulkOps = journalEntry.entries.map(entry => ({
      updateOne: {
        filter: { _id: entry.account },
        update: {
          $inc: { balance: calculateBalanceChange(entry) },
          $push: { balanceHistory: { balance: this.balance, currency: this.currency } },
        },
      },
    }));

    await this.bulkWrite(bulkOps, { session });
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Helper: Calculate balance change based on debit/credit and account type
function calculateBalanceChange(entry) {
  const account = entry.account;
  const amount = entry.type === "debit" ? entry.amount : -entry.amount;
  
  return account.isContraAccount 
    ? -amount 
    : ["Assets", "Expenses"].includes(account.category) 
      ? amount 
      : -amount;
}

// ========================
//  EXPORT
// ========================
module.exports = mongoose.model("Account", AccountSchema);