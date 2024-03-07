const mongoose = require("mongoose");

const modules_schema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("modules", modules_schema, "modules");
