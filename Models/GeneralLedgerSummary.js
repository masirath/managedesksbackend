const mongoose = require("mongoose");

const GeneralLedgerSummarySchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    required: true,
  },
  branch: {
    type: String,
    required: true, // Branch this ledger belongs to (company-specific)
  },
  openingBalance: {
    type: Number,
    default: 0,
  },
  closingBalance: {
    type: Number,
    default: 0,
  },
  totalDebits: {
    type: Number,
    default: 0,
  },
  totalCredits: {
    type: Number,
    default: 0,
  },
  period: {
    type: Date,
    required: true,
  },
  transactions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Transaction",
  }],
}, {
  timestamps: true,
});

module.exports = mongoose.model("GeneralLedgerSummary", GeneralLedgerSummarySchema);
