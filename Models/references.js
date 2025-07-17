const mongoose = require("mongoose");

const references_schema = mongoose.Schema({
  name: {
    required: false,
    type: String,
  },
  code: {
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

module.exports = mongoose.model("references", references_schema, "references");
