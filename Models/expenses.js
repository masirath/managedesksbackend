const mongoose = require("mongoose");

const expenses_schema = new mongoose.Schema({
  expenses_category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "expense_categorys",
  },
  amount: {
    required: true,
    type: String,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
  description: {
    required: false,
    type: String,
  },
  file: {
    required: false,
    type: String,
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
