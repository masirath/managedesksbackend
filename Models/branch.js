const mongoose = require("mongoose");

const branch_schema = mongoose.Schema({
  name: {
    required: true,
    type: String,
  },
  email: {
    required: false,
    type: String,
  },
  phone: {
    required: false,
    type: String,
  },
  tax_number: {
    required: false,
    type: String,
  },
  zip: {
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
    required: true,
    type: String,
  },
  ref: {
    required: true,
    type: String,
  },
  status: {
    required: true,
    type: Number,
    default: 1,
  },
  updated: {
    required: true,
    type: Date,
  },
  created: {
    required: true,
    type: Date,
  },
});

module.exports = mongoose.model("branch", branch_schema, "branch");
