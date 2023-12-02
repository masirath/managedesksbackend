const mongoose = require("mongoose");

const users_log_schema = new mongoose.Schema({
  first_name: {
    required: true,
    type: String,
  },
  last_name: {
    required: false,
    type: String,
  },
  reference_no: {
    required: false,
    type: String,
  },
  email: {
    required: false,
    type: String,
  },
  phone: {
    required: false,
    type: String,
  },
  role: {
    required: true,
    type: String,
  },
  username: {
    required: true,
    unique: true,
    type: String,
  },
  password: {
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
  status: {
    required: true,
    type: Number,
    default: 1,
  },
  created: {
    required: true,
    type: Date,
  },
});

module.exports = mongoose.model("users_log", users_log_schema, "users_log");
