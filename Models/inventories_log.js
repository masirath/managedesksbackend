const mongoose = require("mongoose");

const inventories_log_schema = mongoose.Schema({
  inventory: {
    required: true,
    type: String,
  },
  number: {
    required: true,
    type: Number,
  },
  purchase: {
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: "purchase_orders",
  },
  product: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "products",
  },
  barcode: {
    required: false,
    type: String,
  },
  purchase_price: {
    required: true,
    type: Number,
    default: 0,
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
  tax: {
    required: true,
    type: Number,
    default: 0,
  },
  stock: {
    required: true,
    type: Number,
    default: 0,
  },
  manufacture_date: {
    required: false,
    type: Date,
  },
  expiry_date: {
    required: false,
    type: Date,
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
  "inventories_log",
  inventories_log_schema,
  "inventories_log"
);
