const mongoose = require("mongoose");

const inventories_units_details_schema = mongoose.Schema({
  inventory: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "inventories",
  },
  name: {
    required: true,
    type: String,
    ref: "product_units",
  },
  conversion: {
    required: true,
    type: Number,
    default: 0,
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
  wholesale_price: {
    required: false,
    type: Number,
  },
  stock: {
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

module.exports = mongoose.model(
  "inventories_units_details",
  inventories_units_details_schema,
  "inventories_units_details"
);
