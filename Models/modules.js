const mongoose = require("mongoose");

const modules_schema = mongoose.Schema({
  name: {
    required: true,
    type: String,
  },
  status: {
    required: true,
    type: Number,
    default: 1,
  },
  created: {
    required: true,
    type: Date,
  },
});

module.exports = mongoose.model("modules", modules_schema, "modules");
