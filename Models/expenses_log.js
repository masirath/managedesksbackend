const mongoose = require("mongoose");

const expenses_log_schema = mongoose.Schema({
  number: {
    required: true,
    type: String,
  },
  date: {
    required: true,
    type: Date,
  },
  category: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "expense_categories",
  },
  description: {
    required: false,
    type: String,
  },
  payment: {
    required: true,
    type: String,
  },
  amount: {
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
  "expenses_log",
  expenses_log_schema,
  "expenses_log"
);
