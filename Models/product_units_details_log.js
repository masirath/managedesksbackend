const mongoose = require("mongoose");

const product_units_details_log_schema = mongoose.Schema({
  product_unit: {
    required: true,
    type: String,
  },
  product: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "products",
  },
  name: {
    required: true,
    type: String,
  },
  conversion: {
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
  "product_units_details_log",
  product_units_details_log_schema,
  "product_units_details_log"
);
