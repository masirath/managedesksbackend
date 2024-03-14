const mongoose = require("mongoose");

const purchase_details_schema = new mongoose.Schema({
  purchase_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "purchases",
  },
  item_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "items",
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
  "purchase_details",
  purchase_details_schema,
  "purchase_details"
);
