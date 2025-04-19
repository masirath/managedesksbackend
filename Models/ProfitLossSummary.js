// models/ProfitLossSummary.js
const mongoose = require("mongoose");

const AccountSummarySchema = new mongoose.Schema({
  accountId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Account"
  },
  name: String,
  amount: Number
});

const ProfitLossSummarySchema = new mongoose.Schema({
  period: { 
    type: Date, // YYYY-MM-01 format
    required: true,
    unique: true
  },
  startDate: Date,
  endDate: Date,
  revenues: [AccountSummarySchema],
  costOfGoodsSold: [AccountSummarySchema],
  operatingExpenses: [AccountSummarySchema],
  otherIncome: [AccountSummarySchema],
  otherExpenses: [AccountSummarySchema],
  taxes: [AccountSummarySchema],
  grossProfit: Number,
  operatingProfit: Number,
  netProfit: Number,
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to calculate profits
ProfitLossSummarySchema.pre('save', function(next) {
  const sum = (arr) => arr.reduce((total, item) => total + (item?.amount || 0), 0);
  
  this.grossProfit = sum(this.revenues) - sum(this.costOfGoodsSold);
  this.operatingProfit = this.grossProfit - sum(this.operatingExpenses);
  this.netProfit = this.operatingProfit 
                 + sum(this.otherIncome) 
                 - sum(this.otherExpenses) 
                 - sum(this.taxes);
  
  next();
});

module.exports = mongoose.model("ProfitLossSummary", ProfitLossSummarySchema);