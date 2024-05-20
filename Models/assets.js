const mongoose = require("mongoose");

const assets_schema = mongoose.Schema({
  asset: {
    required: true,
    type: String,
  },
  asset_type: {
    required: true,
    type: String,
  },
  purchase_date: {
    required: true,
    type: Date,
  },
  purchase_amount: {
    required: true,
    type: String,
  },
  serial_id: {
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

module.exports = mongoose.model("assets", assets_schema, "assets");
