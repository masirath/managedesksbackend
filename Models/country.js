const mongoose = require("mongoose");

const country_schema = mongoose.Schema({
  image: {
    required: true,
    type: String,
  },
  country: {
    required: true,
    type: String,
  },
  currency: {
    required: true,
    type: String,
  },
  symbol: {
    required: true,
    type: String,
  },
  code: {
    required: true,
    type: String,
  },
  unit: {
    required: true,
    type: String,
  },
});

module.exports = mongoose.model("country", country_schema, "country");
