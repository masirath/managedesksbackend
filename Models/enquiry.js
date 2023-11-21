const mongoose = require("mongoose");

const enquiry_schema = new mongoose.Schema({
  name: {
    required: true,
    type: String,
  },
  email: {
    required: true,
    type: String,
  },
  phone: {
    required: true,
    type: String,
  },
  service: {
    required: false,
    type: String,
  },
  message: {
    required: false,
    type: String,
  },
});

module.exports = mongoose.model("enquiry", enquiry_schema, "enquiry");
