const mongoose = require("mongoose");

const cash_flow_schema = mongoose.Schema({
  transaction_date: {
    required: true,
    type: Date,
  },
  description: {
    required: true,
    type: String,
  },
  amount: {
    required: true,
    type: String,
  },
  cash_flow_type: {
    required: true,
    type: String,
  },
  category: {
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

module.exports = mongoose.model("cash_flow", cash_flow_schema, "cash_flow");
