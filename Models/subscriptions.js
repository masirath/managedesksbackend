const mongoose = require("mongoose");
const branches = require("./branches");

const subscriptions_schema = mongoose.Schema({
  user: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
  date: {
    required: true,
    type: Date,
  },
  due_date: {
    required: true,
    type: Date,
  },
  users: {
    required: true,
    type: Number,
  },
  branches: {
    required: true,
    type: Number,
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
  "subscriptions",
  subscriptions_schema,
  "subscriptions"
);
