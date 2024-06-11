const mongoose = require("mongoose");

const contra_entries_schema = mongoose.Schema({
  transation_date: {
    required: true,
    type: Date,
  },
  description: {
    required: true,
    type: String,
  },
  debit_account: {
    required: true,
    type: String,
  },
  debit_amount: {
    required: true,
    type: String,
  },
  credit_account: {
    required: true,
    type: String,
  },
  credit_amount: {
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
  "contra_entries",
  contra_entries_schema,
  "contra_entries"
);
