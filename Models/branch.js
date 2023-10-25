const mongoose = require("mongoose");

const branch_schema = mongoose.Schema({
  name: {
    required: true,
    type: String,
  },
  email: {
    required: false,
    type: String,
    trim: true,
    unique: true,
  },
  phone: {
    required: false,
    type: Number,
    unique: true,
  },
  ref: {
    required: true,
    type: String,
  },
  zip: {
    required: true,
    type: String,
  },
  street: {
    required: true,
    type: String,
  },
  city: {
    required: true,
    type: String,
  },
  state: {
    required: true,
    type: String,
  },
  country: {
    required: true,
    type: String,
  },
  status: {
    required: true,
    type: Number,
    default: 1,
  },
});

module.exports = mongoose.model("branch", branch_schema, "branch");
