const mongoose = require("mongoose");

const cost_of_goods_schema = new mongoose.Schema({
  transaction_date: {
    required: true,
    type: Date,
  },
  description: {
    required: true,
    type: String,
  },
  inventory_account: {
    required: true,
    type: String,
  },
  goods_sold_account: {
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
  "cost_of_goods",
  cost_of_goods_schema,
  "cost_of_goods"
);
