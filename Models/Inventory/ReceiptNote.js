// const mongoose = require("mongoose");

// const receipt_note_schema = mongoose.Schema({
//   purchase_order: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "purchase_orders",
//     required: true,
//   },
//   receipt_number: {
//     type: String,
//     required: true,
//   },
//   receipt_date: {
//     type: Date,
//     required: true,
//   },
//   items: [
//     {
//       item: { type: mongoose.Schema.Types.ObjectId, ref: "items", required: true },
//       received_quantity: { type: Number, required: true },
//       unit_cost: { type: Number, required: true },
//       total_cost: { type: Number, required: true },
//     },
//   ],
//   notes: String,
//   status: {
//     type: String,
//     enum: ["draft", "received", "cancelled"],
//     default: "draft",
//   },
//   branch: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "branches",
//   },
//   created_by: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "users",
//   },
//   created_at: {
//     type: Date,
//     default: Date.now,
//   },
// });

// module.exports = mongoose.model("receipt_notes", receipt_note_schema, "receipt_notes");
