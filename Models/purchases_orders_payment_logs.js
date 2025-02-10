const mongoose = require("mongoose");

const purchases_payment_log_schema = mongoose.Schema({
  payment: {
    required: true,
    type: String,
  },
  purchase: {
    required: true,
    type: String,
  },
  type: {
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
    type: mongoose.Schema.Types.ObjectId,
    ref: "branches",
  },
  created: {
    required: true,
    type: Date,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
});

module.exports = mongoose.model(
  "purchases_payment_log",
  purchases_payment_log_schema,
  "purchases_payment_log"
);
