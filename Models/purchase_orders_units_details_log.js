const mongoose = require("mongoose");

const purchase_orders_units_details_log_schema = mongoose.Schema({
  purchase_orders_units_details: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "purchase_orders",
  },
  details: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "purchase_orders_details",
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
  "purchase_orders_units_details_log",
  purchase_orders_units_details_log_schema,
  "purchase_orders_units_details_log"
);
