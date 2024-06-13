const mongoose = require("mongoose");

const credit_note_schema = new mongoose.Schema({
  issue_date: {
    required: true,
    type: Date,
  },
  description: {
    required: true,
    type: String,
  },
  customer_suppliers: {
    required: true,
    type: String,
  },
  note: {
    required: true,
    type: String,
  },
  reason: {
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

module.exports = mongoose.model(
  "credit_note",
  credit_note_schema,
  "credit_note"
);
