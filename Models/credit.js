const mongoose = require("mongoose");

const credit_schema = new mongoose.Schema({
  transaction_date: {
    required: true,
    type: Date,
  },
  description: {
    required: true,
    type: String,
  },
  account: {
    required: true,
    type: String,
  },
  amount: {
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

module.exports = mongoose.model("credit", credit_schema, "credit");
