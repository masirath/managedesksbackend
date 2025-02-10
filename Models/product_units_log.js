const mongoose = require("mongoose");

const product_units_log_schema = mongoose.Schema({
  unit: {
    required: true,
    type: String,
  },
  name: {
    required: true,
    type: String,
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
  "product_units_log",
  product_units_log_schema,
  "product_units_log"
);
