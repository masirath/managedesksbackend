const mongoose = require("mongoose");

const industry_schema = mongoose.Schema({
  name: {
    required: true,
    type: String,
  },
});

module.exports = mongoose.model("industry", industry_schema, "industry");
