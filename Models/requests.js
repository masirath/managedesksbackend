const mongoose = require("mongoose");

const requests_schema = mongoose.Schema({
  number: {
    required: true,
    type: String,
  },
  supplier: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "branches",
  },
  date: {
    required: true,
    type: Date,
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
    type: mongoose.Schema.Types.ObjectId,
    ref: "branches",
  },
  created: {
    required: true,
    type: Date,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
});

module.exports = mongoose.model("requests", requests_schema, "requests");
