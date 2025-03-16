const mongoose = require("mongoose");

const expenses_schema = mongoose.Schema({
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

module.exports = mongoose.model("expenses", expenses_schema, "expenses");
