const mongoose = require("mongoose");

const lpos_schema = mongoose.Schema({
  number: {
    required: true,
    type: String,
  },
  quote: {
    required: false,
    type: String,
  },
  supplier: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "suppliers",
  },
  date: {
    required: true,
    type: Date,
  },
  due_date: {
    required: false,
    type: Date,
  },
  subtotal: {
    required: true,
    type: Number,
    default: 0,
  },
  taxamount: {
    required: true,
    type: Number,
    default: 0,
  },
  discount: {
    required: true,
    type: Number,
    default: 0,
  },
  delivery: {
    required: true,
    type: Number,
    default: 0,
  },
  delivery_status: {
    required: true,
    type: Number,
    default: 0,
  },
  delivery_date: {
    required: false,
    type: Date,
  },
  payment_status: {
    required: true,
    type: Number,
    default: 0,
  },
  total: {
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

module.exports = mongoose.model("lpos", lpos_schema, "lpos");
