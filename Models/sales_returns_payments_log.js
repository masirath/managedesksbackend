const mongoose = require("mongoose");

const sales_returns_payments_log_schema = mongoose.Schema({
  sales_returns_payments: {
    required: true,
    type: String,
  },
  sales_returns: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "sales_returns",
  },
  name: {
    required: true,
    type: String,
  },
  amount: {
    required: true,
    type: Number,
    default: 0,
  },
  status: {
    required: true,
    type: Number,
    default: 1,
  },
  ref: {
    required: true,
    type: Number,
  },
  branch: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "branches",
  },
  updated: {
    required: true,
    type: Date,
  },
  updated_by: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
});

module.exports = mongoose.model(
  "sales_returns_payments_log",
  sales_returns_payments_log_schema,
  "sales_returns_payments_log"
);
