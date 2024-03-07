const mongoose = require("mongoose");

const website_schema = new mongoose.Schema({
  name: {
    required: true,
    type: String,
  },
  email: {
    required: true,
    type: String,
  },
  company: {
    required: true,
    type: String,
  },
  phone: {
    required: true,
    type: String,
  },
  requirement: {
    required: true,
    type: String,
  },
  date: {
    required: true,
    type: Date,
  },
});

module.exports = mongoose.model("website", website_schema, "website");
