const mongoose = require("mongoose");

const role_details_schema = new mongoose.Schema({
  role_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "roles",
  },
  module_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "module_details",
  },
  access: {
    type: Number,
    required: true,
  },
  create: {
    type: Number,
    required: true,
  },
  read: {
    type: Number,
    required: true,
  },
  update: {
    type: Number,
    required: true,
  },
  delete: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model(
  "role_details",
  role_details_schema,
  "role_details"
);
