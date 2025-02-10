const mongoose = require("mongoose");

const expense_categories_log_schema = mongoose.Schema({
  category: {
    required: true,
    type: String,
  },
  name: {
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
  "expense_categories_log",
  expense_categories_log_schema,
  "expense_categories_log"
);
