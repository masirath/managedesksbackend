const mongoose = require("mongoose");

const cash_basic_accounting_schema = mongoose.Schema({
  transaction_date: {
    required: true,
    type: Date,
  },
  memo: {
    required: true,
    type: String,
  },
  amount: {
    required: true,
    type: String,
  },
  transaction_type: {
    required: true,
    type: String,
  },
  account: {
    required: true,
    type: String,
  },
  reference: {
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
  "cash_basic_accounting",
  cash_basic_accounting_schema,
  "cash_basic_accounting"
);
