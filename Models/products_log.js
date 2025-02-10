const mongoose = require("mongoose");

const products_log_schema = mongoose.Schema({
  product: {
    required: true,
    type: String,
  },
  image: {
    required: false,
    type: String,
  },
  name: {
    required: true,
    type: String,
  },
  barcode: {
    required: false,
    type: String,
  },
  unit: {
    required: false,
    type: String,
  },
  category: {
    required: false,
    type: String,
  },
  brand: {
    required: false,
    type: String,
  },
  stock: {
    required: true,
    type: Number,
    default: 0,
  },
  expiry: {
    required: true,
    type: Number,
    default: 0,
  },
  tax: {
    required: true,
    type: Number,
    default: 0,
  },
  type: {
    required: true,
    type: Number,
    default: 1,
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
  "products_log",
  products_log_schema,
  "products_log"
);
