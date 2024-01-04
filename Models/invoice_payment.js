const mongoose = require("mongoose");

const invoice_payment_schema = new mongoose.Schema({
  invoice_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "invoice",
  },
  amount: {
    required: true,
    type: Number,
    default: 0,
  },
  type: {
    required: true,
    type: String,
  },
  payment_status: {
    required: true,
    type: String,
    /*{ Pending , Received }*/
  },
  status: {
    required: true,
    type: Number,
    default: 1,
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
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
});

module.exports = mongoose.model(
  "invoice_payment",
  invoice_payment_schema,
  "invoice_payment"
);
