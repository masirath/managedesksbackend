const mongoose = require("mongoose");

const users_log_schema = mongoose.Schema({
  user: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
  name: {
    required: true,
    type: String,
  },
  phone: {
    required: true,
    type: String,
  },
  email: {
    required: true,
    type: String,
  },
  password: {
    required: true,
    type: String,
  },
  branches: {
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: "branches",
  },
  role: {
    required: false,
    type: String,
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
  login: {
    required: false,
    type: Date,
  },
  logout: {
    required: false,
    type: Date,
  },
  updated: {
    required: true,
    type: Date,
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
});

module.exports = mongoose.model("users_log", users_log_schema, "users_log");
