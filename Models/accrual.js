const mongoose = require("mongoose");

const accrual_schema = mongoose.Schema({
  date: {
    required: true,
    type: Date,
  },
  description: {
    required: false,
    type: String,
  },
  amount: {
    required: true,
    type: String,
  },
  account: {
    required: false,
    type: String,
  },
  transaction: {
    required: false,
    type: String,
  },
  reference: {
    required: false,
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

module.exports = mongoose.model("accrual", accrual_schema, "accrual");
