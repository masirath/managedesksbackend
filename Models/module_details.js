const mongoose = require("mongoose");

const module_details_schema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  module_id: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model(
  "module_details",
  module_details_schema,
  "module_details"
);
