const mongoose = require("mongoose");

const purchases_returns_payments_schema = mongoose.Schema({
  purchases_return: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "purchases_returns",
  },
  name: {
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

module.exports = mongoose.model(
  "purchases_returns_payments",
  purchases_returns_payments_schema,
  "purchases_returns_payments"
);
