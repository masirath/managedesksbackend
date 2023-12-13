const mongoose = require("mongoose");

const invoice_schema = new mongoose.Schema({
  invoice_number: {
    required: true,
    type: String,
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "customers",
  },
  date_from: {
    required: true,
    type: Date,
  },
  date_to: {
    required: true,
    type: Date,
  },
  total: {
    required: true,
    type: Number,
  },
  tax_amount: {
    required: true,
    type: Number,
  },
  grand_total: {
    required: true,
    type: Number,
  },
  invoice_status: {
    required: true,
    type: String,
    /*{ Paid , Unpaid , Overdue }*/
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
});

module.exports = mongoose.model("invoice", invoice_schema, "invoice");
