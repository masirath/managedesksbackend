const mongoose = require("mongoose");

const deliveries_schema = new mongoose.Schema({
  delivery_number: {
    required: true,
    type: String,
  },
  invoice_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "invoice",
  },
  po_id: {
    required: false,
    type: String,
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "customers",
  },
  delivered_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
  date: {
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
  delivery_status: {
    required: true,
    type: String,
    /*{ Pending , Sent , Delivered }*/
  },
  grand_total: {
    required: true,
    type: Number,
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

module.exports = mongoose.model("deliveries", deliveries_schema, "deliveries");
