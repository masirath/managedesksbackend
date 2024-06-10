const mongoose = require("mongoose");

const closing_balance_schema = mongoose.Schema({
  closing_date: {
    required: true,
    type: Date,
  },
  account_category: {
    required: true,
    type: String,
  },
  balance: {
    required: true,
    type: String,
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

module.exports = mongoose.model(
  "closing_balance",
  closing_balance_schema,
  "closing_balance"
);
