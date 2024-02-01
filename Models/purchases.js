const mongoose = require("mongoose");

const purchases_schema = new mongoose.Schema({
  purchase_number: {
    required: true,
    type: String,
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "suppliers",
  },
  supplier_name: {
    required: true,
    type: String,
  },
  supplier_email: {
    required: false,
    type: String,
  },
  supplier_phone: {
    required: false,
    type: String,
  },
  supplier_area: {
    required: false,
    type: String,
  },
  supplier_city: {
    required: false,
    type: String,
  },
  supplier_state: {
    required: false,
    type: String,
  },
  supplier_country: {
    required: true,
    type: String,
  },
  supplier_tax: {
    required: false,
    type: String,
  },
  reference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
  date_from: {
    required: true,
    type: Date,
  },
  date_to: {
    required: false,
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
  purchase_status: {
    required: true,
    type: String,
    /* { Pending , Sent , Delivered } */
  },
  payment_status: {
    required: true,
    type: String,
    /* { Paid , Unpaid } */
  },
  paid_amount: {
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

module.exports = mongoose.model("purchases", purchases_schema, "purchases");
