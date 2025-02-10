const mongoose = require("mongoose");

const purchases_returns_log_schema = mongoose.Schema({
  purchases_return: {
    required: true,
    type: String,
  },
  number: {
    required: true,
    type: String,
  },
  supplier: {
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: "suppliers",
  },
  date: {
    required: true,
    type: Date,
  },
  due_date: {
    required: false,
    type: Date,
  },
  subtotal: {
    required: true,
    type: Number,
    default: 0,
  },
  taxamount: {
    required: true,
    type: Number,
    default: 0,
  },
  discount: {
    required: true,
    type: Number,
    default: 0,
  },
  delivery: {
    required: true,
    type: Number,
    default: 0,
  },
  delivery_status: {
    required: true,
    type: Number,
    default: 0,
  },
  delivery_date: {
    required: false,
    type: Date,
  },
  payment_status: {
    required: true,
    type: Number,
    default: 0,
  },
  payment_types: {
    required: false,
    type: String,
  },
  payments: {
    required: false,
    type: String,
  },
  paid: {
    required: true,
    type: Number,
    default: 0,
  },
  remaining: {
    required: true,
    type: Number,
    default: 0,
  },
  total: {
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
    type: mongoose.Schema.Types.ObjectId,
    ref: "branches",
  },
  updated: {
    required: true,
    type: Date,
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
});

module.exports = mongoose.model(
  "purchases_returns_log",
  purchases_returns_log_schema,
  "purchases_returns_log"
);
