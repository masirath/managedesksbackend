const mongoose = require("mongoose");

const purchase_orders_details_schema = mongoose.Schema({
  purchase: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "purchase_orders",
  },
  inventory: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "inventories",
  },
  description: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "products",
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
  discount_price: {
    required: true,
    type: Number,
    default: 0,
  },
  discount_percentage: {
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
  batch: {
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
  wholesale_price: {
    required: false,
    type: Number,
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
  "purchase_orders_details",
  purchase_orders_details_schema,
  "purchase_orders_details"
);
