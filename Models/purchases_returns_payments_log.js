const mongoose = require("mongoose");

const purchases_returns_payments_log_schema = mongoose.Schema({
  purchases_returns_payments: {
    required: true,
    type: String,
  },
  purchases_return: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "purchases_returns",
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
  "purchases_returns_payments_log",
  purchases_returns_payments_log_schema,
  "purchases_returns_payments_log"
);
