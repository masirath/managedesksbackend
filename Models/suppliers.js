const mongoose = require("mongoose");

const suppliers_schema = mongoose.Schema({
  name: {
    required: true,
    type: String,
  },
  email: {
    required: false,
    type: String,
  },
  phone: {
    required: true,
    type: String,
  },
  catalog: {
    required: false,
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

module.exports = mongoose.model("suppliers", suppliers_schema, "suppliers");
