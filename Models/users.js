const mongoose = require("mongoose");

const users_schema = new mongoose.Schema({
  email: {
    required: true,
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    required: false,
    type: String,
    unique: true,
  },
  password: {
    required: true,
    type: String,
  },
  role: {
    required: true,
    type: String,
  },
  ref: {
    required: true,
    type: String,
  },
  branch: {
    required: false,
    type: String,
  },
  status: {
    required: true,
    type: Number,
    default: 1,
  },
});

module.exports = mongoose.model("users", users_schema, "users");
