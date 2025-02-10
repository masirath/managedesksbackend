const mongoose = require("mongoose");

const invoices_payments_log_schema = mongoose.Schema({
  invoices_payments: {
    required: true,
    type: String,
  },
  purchase: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "invoices",
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
  "invoices_payments_log",
  invoices_payments_log_schema,
  "invoices_payments_log"
);
