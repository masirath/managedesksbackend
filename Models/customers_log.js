const mongoose = require("mongoose");

const customers_log_schema = mongoose.Schema({
  customer: {
    required: true,
    type: String,
  },
  name: {
    required: false,
    type: String,
  },
  email: {
    required: false,
    type: String,
    trim: true,
  },
  phone: {
    required: true,
    type: String,
  },
  tax: {
    required: false,
    type: String,
  },
  area: {
    required: false,
    type: String,
  },
  city: {
    required: false,
    type: String,
  },
  state: {
    required: false,
    type: String,
  },
  country: {
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
  "customers_log",
  customers_log_schema,
  "customers_log"
);
