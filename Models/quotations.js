const mongoose = require("mongoose");

const quotation_schema = new mongoose.Schema({
  quote_number: {
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
  quotation_status: {
    required: true,
    type: String,
    /* Pending, Sent, Ordered */
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

module.exports = mongoose.model("quotations", quotation_schema, "quotations");
