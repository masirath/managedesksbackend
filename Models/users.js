const mongoose = require("mongoose");

const users_schema = new mongoose.Schema({
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
    required: true,
    type: String,
  },
  status: {
    required: false,
    type: Number,
    default: 1,
  },
});

module.exports = mongoose.model("users", users_schema, "users");
