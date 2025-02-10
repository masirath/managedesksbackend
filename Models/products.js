const mongoose = require("mongoose");

const products_schema = mongoose.Schema({
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
    type: mongoose.Schema.Types.ObjectId,
    ref: "product_units",
  },
  category: {
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: "product_categories",
  },
  brand: {
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: "product_brands",
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
  created: {
    required: true,
    type: Date,
  },
  created_by: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
});

module.exports = mongoose.model("products", products_schema, "products");
