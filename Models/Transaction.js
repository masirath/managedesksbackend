const Account = require("./Account");
const mongoose = require("mongoose");

// Keep in sync with Account model
const accountTypes = [
  "Bank & Cash", "Current Asset", "Depreciation", "Fixed Asset", "Inventory",
  "Non-current Asset", "Prepayment", "Equity", "Revenue", "Expense", "Direct Costs",
  "Income", "Sales Revenue", "Direct Expense", "Current Liability", "Liability", "Non-current Liability"
];

const accountCategories = ["Assets", "Liabilities", "Equity", "Expenses", "Income"];

const TransactionSchema = new mongoose.Schema({
  journalEntryId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "ManualJournal",
    required: true
  },
  accountId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Account",
    required: true
  },
  date: { 
    type: Date, 
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    set: v => parseFloat(v.toFixed(2))
  },
  entryType: { // renamed to avoid conflict
    type: String,
    enum: ["debit", "credit"],
    required: true
  },
  category: {
    type: String,
    enum: accountCategories,
    required: true
  },
  accountType: {
    type: String,
    enum: accountTypes,
    required: true
  },
  period: { 
    type: Date,
    required: true,
    default: function () {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  },
  branch: {
    type: String,
    default: "Main",
    index: true
  },
  isReconciled: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Indexes for fast querying
TransactionSchema.index({ period: 1, category: 1 });
TransactionSchema.index({ period: 1, accountType: 1 });
TransactionSchema.index({ date: 1, branch: 1 });

module.exports = mongoose.model("Transaction", TransactionSchema);
