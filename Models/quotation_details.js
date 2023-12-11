const mongoose = require("mongoose");

const quotation_details_schema = new mongoose.Schema({
  quotation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "quotations",
  },
  item_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: " items",
  },
  item_name: {
    required: true,
    type: String,
  },
  item_unit: {
    required: true,
    type: String,
  },
  item_quantity: {
    required: true,
    type: Number,
  },
  item_price: {
    required: true,
    type: Number,
  },
  amount: {
    required: true,
    type: Number,
  },
  item_discount: {
    required: false,
    type: Number,
  },
  discount_amount: {
    required: false,
    type: Number,
  },
  item_tax: {
    required: false,
    type: Number,
  },
  total: {
    required: true,
    type: Number,
  },
});

module.exports = mongoose.model(
  "quotation_details",
  quotation_details_schema,
  "quotation_details"
);
