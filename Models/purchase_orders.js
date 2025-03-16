const mongoose = require("mongoose");

const purchase_orders_schema = mongoose.Schema({
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
    type: mongoose.Schema.Types.ObjectId,
    ref: "suppliers",
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
  created: {
    required: true,
    type: Date,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
});

module.exports = mongoose.model(
  "purchase_orders",
  purchase_orders_schema,
  "purchase_orders"
);
