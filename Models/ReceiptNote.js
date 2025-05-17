// const mongoose = require('mongoose');
// const Schema = mongoose.Schema;

// const receiptNoteSchema = new Schema({
//   purchase_order: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'PurchaseOrder', // Linking to PurchaseOrder model
//     required: true,
//   },
//   reference: {
//     type: String,
//     required: true,
//   },
//   note: {
//     type: String,
//     default: '',
//   },
//   supplier: {
//     type: String,
//     required: true,
//   },
//   delivery_note: {
//     type: String,
//     required: true,
//   },
//   warehouse_location: {
//     type: String,
//     required: true,
//   },
//   invoice_number: {
//     type: String,
//     required: true,
//   },
//   received_by: {
//     type: String,
//     required: true,
//   },
//   date: {
//     type: Date,
//     required: true,
//     default: Date.now,
//   },
//   items: [
//     {
//       item: { 
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Item', // Assuming Item model exists
//         required: true,
//       },
//       quantity: {
//         type: Number,
//         required: true,
//       },
//       received_quantity: {
//         type: Number,
//         required: true,
//       },
//     },
//   ],
//   status: {
//     type: Number,
//     default: 1, // Assuming '1' is active
//   },
//   ref: {
//     type: String,
//     required: true,
//   },
//   branch: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Branch', // Assuming Branch model is defined
//     required: true,
//   },
//   created: {
//     type: Date,
//     default: Date.now,
//   },
//   created_by: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User', // Assuming User model is defined
//     required: true,
//   },
// });

// module.exports = mongoose.model('ReceiptNote', receiptNoteSchema);
