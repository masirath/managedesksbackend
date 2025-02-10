const mongoose = require("mongoose");
const purchase_orders = require("./purchase_orders");

const transfers_schema = mongoose.Schema({
  number: {
    required: true,
    type: String,
  },
  supplier: {
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: "branches",
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
  received: {
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
    type: String,
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

module.exports = mongoose.model("transfers", transfers_schema, "transfers");
