const mongoose = require("mongoose");

const tax_schema = mongoose.Schema({
  name: {
    required: true,
    type: String,
  },
  value: {
    required: true,
    type: String,
  },
});

module.exports = mongoose.model("tax", tax_schema, "tax");
