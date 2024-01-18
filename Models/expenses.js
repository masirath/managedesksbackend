const mongoose = require("mongoose");

const expenses_schema = new mongoose.Schema({
  name: {
    required: true,
    type: String,
  },
  expenses_category: {
    required: true,
    type: String,
  },
  date: {
    required: true,
    type: Date,
  },
  amount: {
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

module.exports = mongoose.model("expenses", expenses_schema, "expenses");
