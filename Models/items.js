const mongoose = require("mongoose");

const items_schema = new mongoose.Schema({
  name: {
    required: true,
    type: String,
  },
  unit: {
    required: true,
    type: String,
  },
  stock: {
    required: false,
    type: Number,
  },
  purchase_price: {
    required: true,
    type: Number,
  },
  sale_price: {
    required: true,
    type: Number,
  },
  tax: {
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
  image: {
    required: false,
    type: String,
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
    ref: "branch",
  },
  created: {
    required: true,
    type: Date,
  },
  updated: {
    required: true,
    type: Date,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
});

module.exports = mongoose.model("items", items_schema, "items");
