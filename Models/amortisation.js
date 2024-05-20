const mongoose = require("mongoose");

const amortisation_schema = mongoose.Schema({
  asset: {
    required: true,
    type: String,
  },
  cost: {
    required: true,
    type: Number,
  },
  period: {
    required: true,
    type: String,
  },
  from: {
    required: true,
    type: Date,
  },
  to: {
    required: true,
    type: Date,
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
  "amortisation",
  amortisation_schema,
  "amortisation"
);
