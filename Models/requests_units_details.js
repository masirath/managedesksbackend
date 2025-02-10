const mongoose = require("mongoose");

const requests_units_details_schema = mongoose.Schema({
  details: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "requests_details",
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
  conversion: {
    required: true,
    type: Number,
    default: 0,
  },
  unit_quantity: {
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
  "requests_units_details",
  requests_units_details_schema,
  "requests_units_details"
);
