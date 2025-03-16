const mongoose = require("mongoose");

const purchase_orders_log_schema = mongoose.Schema({
  purchase: {
    required: true,
    type: String,
  },
  number: {
    required: true,
    type: String,
  },
  invoice: {
    required: false,
    type: String,
  },
  supplier: {
    required: true,
    type: String,
  },
  project: {
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: "projects",
  },
  date: {
    required: true,
    type: Date,
  },
  due_date: {
    required: true,
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
  "purchase_orders_log",
  purchase_orders_log_schema,
  "purchase_orders_log"
);
