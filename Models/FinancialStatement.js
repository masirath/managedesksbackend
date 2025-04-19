const mongoose = require("mongoose");

const financialStatementSchema = new mongoose.Schema({
  name: String,
  code: String,
  type: String,
  category: String,
  balance: Number,
  branch: mongoose.Schema.Types.ObjectId,
  currency: String,
  status: String,
  createdAt: { type: Date, default: Date.now },
  date: Date, // Add date for filtering data by date
});

const FinancialStatement = mongoose.model("FinancialStatement", financialStatementSchema);
module.exports = FinancialStatement;
