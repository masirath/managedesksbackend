const mongoose = require("mongoose");

const sales_returns_details_log_schema = mongoose.Schema({
  detail: {
    required: true,
    type: String,
  },
  sales_return: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "sales_returns",
  },
  description: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "inventories",
  },
  name: {
    required: true,
    type: String,
  },
  unit: {
    required: false,
    type: String,
  },
  unit_name: {
    required: false,
    type: String,
  },
  purchase_price: {
    required: true,
    type: Number,
    default: 0,
  },
  conversion: {
    required: true,
    type: Number,
    default: 0,
  },
  quantity: {
    required: true,
    type: Number,
    default: 0,
  },
  delivered: {
    required: true,
    type: Number,
    default: 0,
  },
  tax: {
    required: false,
    type: Number,
    default: 0,
  },
  total: {
    required: false,
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
  "sales_returns_details_log",
  sales_returns_details_log_schema,
  "sales_returns_details_log"
);
