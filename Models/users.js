const mongoose = require("mongoose");

const users_schema = mongoose.Schema({
  image: {
    required: false,
    type: String,
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
    unique: true,
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
  created: {
    required: true,
    type: Date,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
});

module.exports = mongoose.model("users", users_schema, "users");
