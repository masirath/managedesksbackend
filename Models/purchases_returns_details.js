const mongoose = require("mongoose");

const purchases_returns_details_schema = mongoose.Schema({
  purchases_return: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "purchases_returns",
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
  quantity: {
    required: true,
    type: Number,
    default: 0,
  },
  conversion: {
    required: true,
    type: Number,
    default: 0,
  },
  delivered: {
    required: true,
    type: Number,
    default: 0,
  },
  free: {
    required: true,
    type: Number,
    default: 0,
  },
  tax: {
    required: false,
    type: Number,
    default: 0,
  },
  barcode: {
    required: false,
    type: String,
  },
  price_per_unit: {
    required: true,
    type: Number,
    default: 0,
  },
  sale_price: {
    required: true,
    type: Number,
    default: 0,
  },
  expiry_date: {
    required: false,
    type: Date,
  },
  tax_amount: {
    required: true,
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
  "purchases_returns_details",
  purchases_returns_details_schema,
  "purchases_returns_details"
);
