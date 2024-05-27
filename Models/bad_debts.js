const mongoose = require("mongoose");

const bad_debts_schema = mongoose.Schema({
  debtor_name: {
    required: true,
    type: String,
  },
  contact: {
    required: true,
    type: String,
  },
  debt_amount: {
    required: true,
    type: String,
  },
  debt_date: {
    required: true,
    type: Date,
  },
  reason: {
    required: true,
    type: String,
  },
  approver_name: {
    required: true,
    type: String,
  },
  approval_date: {
    required: true,
    type: Date,
  },
  comments: {
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

module.exports = mongoose.model("bad_debts", bad_debts_schema, "bad_debts");
