// // Models/delivery_notes.js

// Models/delivery_notes.js

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const delivery_noteSchema = new Schema({
  customer: { type: Schema.Types.ObjectId, ref: "customers", required: true },
  number: { type: Number, required: true },
  date: { type: Date, required: true },
  reference: { type: String, default: "" },
  total_items: { type: Number, default: 0 },
  status: { type: Number, default: 0 }, // 0 = draft, 1 = active, 2 = deleted

  // ✅ Details array with schema-level validation
  details: [
    {
      description: {
        type: Schema.Types.ObjectId,
        ref: "products",
        required: true,
        validate: {
          validator: mongoose.Types.ObjectId.isValid,
          message: "Invalid product ID in description",
        },
      },
      // unit: {
      //   type: Schema.Types.ObjectId,
      //   ref: "units",
      //   required: true,
      //   validate: {
      //     validator: mongoose.Types.ObjectId.isValid,
      //     message: "Invalid unit ID",
      //   },
      // },
      unit: { type: Number, default: 0 },
      unit_name: { type: String, default: "" },
      quantity: { type: Number, default: 0 },
      free: { type: Number, default: 0 },
      barcode: { type: String, default: "" },
      remarks: { type: String, default: "" },
    },
  ],

  branch: { type: Schema.Types.ObjectId, ref: "branches", required: true },
  ref: { type: String },
  created: { type: Date, default: Date.now },
  created_by: { type: Schema.Types.ObjectId, ref: "users", required: true },
  updated: { type: Date },
  updated_by: { type: Schema.Types.ObjectId, ref: "users" },
});

module.exports = mongoose.model("delivery_notes", delivery_noteSchema);
