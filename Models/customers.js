const mongoose = require("mongoose");

const customers_schema = new mongoose.Schema({
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
  tax_number: {
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

module.exports = mongoose.model("customers", customers_schema, "customers");
