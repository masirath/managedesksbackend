const mongoose = require("mongoose");

const product_units_details_schema = mongoose.Schema({
  product: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "products",
  },
  name: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "product_units",
  },
  conversion: {
    required: true,
    type: Number,
    default: 0,
  },
  purchase_price: {
    required: false,
    type: Number,
  },
  sale_price: {
    required: false,
    type: Number,
  },
  wholesale_price: {
    required: false,
    type: Number,
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
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "branches",
  },
  created: {
    required: true,
    type: Date,
  },
  created_by: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
});

module.exports = mongoose.model(
  "product_units_details",
  product_units_details_schema,
  "product_units_details"
);
