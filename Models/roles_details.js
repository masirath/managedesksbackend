const mongoose = require("mongoose");

const roles_details_schema = mongoose.Schema({
  role: {
    required: true,
    type: String,
  },
  name: {
    required: true,
    type: String,
  },
  full_access: {
    required: true,
    type: Number,
    default: 1,
  },
  view: {
    required: true,
    type: Number,
    default: 1,
  },
  create: {
    required: true,
    type: Number,
    default: 1,
  },
  update: {
    required: true,
    type: Number,
    default: 1,
  },
  delete: {
    required: true,
    type: Number,
    default: 1,
  },
  approve: {
    required: true,
    type: Number,
    default: 1,
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

module.exports = mongoose.model(
  "roles_details",
  roles_details_schema,
  "roles_details"
);
