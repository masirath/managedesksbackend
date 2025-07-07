// Models/delivery_note_details.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const delivery_note_detailSchema = new Schema({
  delivery_note: { type: Schema.Types.ObjectId, ref: "delivery_notes" },
  description: { type: Schema.Types.ObjectId, ref: "products" },
  name: { type: String },
  unit: { type: Number },
  unit_name: { type: String },
  quantity: { type: Number },
  free: { type: Number, default: 0 },
  barcode: { type: String },
  status: { type: Number, default: 0 }, // 0 = active, 2 = deleted
  branch: { type: Schema.Types.ObjectId, ref: "branches" },
  ref: { type: String },
  created: { type: Date, default: Date.now },
  created_by: { type: Schema.Types.ObjectId, ref: "users" },
  updated: { type: Date },
  updated_by: { type: Schema.Types.ObjectId, ref: "users" },
});

module.exports = mongoose.model("delivery_note_details", delivery_note_detailSchema);
