const mongoose = require("mongoose");

const lpos_units_details_schema = mongoose.Schema({
  details: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "lpos_details",
  },
  inventory_unit: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "inventories_units_details",
  },
  name: {
    required: true,
    type: String,
  },
  quantity: {
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
  conversion: {
    required: true,
    type: Number,
    default: 0,
  },
  sale_price: {
    required: true,
    type: Number,
    default: 0,
  },
  unit_quantity: {
    required: true,
    type: Number,
    default: 0,
  },
  unit_delivered: {
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
  "lpos_units_details",
  lpos_units_details_schema,
  "lpos_units_details"
);
