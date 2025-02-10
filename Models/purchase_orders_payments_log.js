const mongoose = require("mongoose");

const purchase_orders_payments_log_schema = mongoose.Schema({
  purchase_orders_payments: {
    required: true,
    type: String,
  },
  purchase: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "purchase_orders",
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
  "purchase_orders_payments_log",
  purchase_orders_payments_log_schema,
  "purchase_orders_payments_log"
);
