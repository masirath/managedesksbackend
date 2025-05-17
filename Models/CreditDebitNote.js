// const mongoose = require('mongoose');
// const { Schema } = mongoose;

// const itemSchema = new Schema({
//   description: { type: String, required: true },
//   quantity: { type: Number, default: 1 },
//   rate: { type: Number, required: true },
//   discount: { type: Number, default: 0 },
//   tax: { type: Number, default: 0 },
//   total: { type: Number, required: true }
// }, { _id: false });

// const creditDebitNoteSchema = new Schema({
//   type: {
//     type: String,
//     enum: ['credit', 'debit'],
//     required: true
//   },
//   noteNumber: { type: String, required: true, unique: true },

//   customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
//   vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },

//   relatedInvoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
//   relatedBillId: { type: Schema.Types.ObjectId, ref: 'Bill' },

//   issueDate: { type: Date, required: true },
//   dueDate: { type: Date },

//   items: [itemSchema],

//   subtotal: { type: Number, required: true },
//   discountTotal: { type: Number, default: 0 },
//   taxTotal: { type: Number, default: 0 },
//   totalAmount: { type: Number, required: true },

//   amountUsed: { type: Number, default: 0 },
//   amountRefunded: { type: Number, default: 0 },
//   balanceRemaining: { type: Number, required: true },

//   status: { type: Number, required: true, default: 1 }, // updated field type
//   ref: { type: Number, required: true }, // custom reference code or serial

//   notes: { type: String },
//   attachments: [{ type: String }],

//   publicShareToken: { type: String, unique: true, sparse: true },
//   publicShareExpiry: { type: Date },

//   templateConfigId: { type: Schema.Types.ObjectId, ref: 'TemplateSetting' },

//   branch: { type: Schema.Types.ObjectId, ref: 'branches', required: true },
//   created: { type: Date, required: true },
//   created_by: { type: Schema.Types.ObjectId, ref: 'users', required: true },

//   createdAt: { type: Date, default: Date.now },
//   updatedAt: { type: Date, default: Date.now }
// });

// creditDebitNoteSchema.index({ noteNumber: 1, branch: 1 }, { unique: true });

// module.exports = mongoose.model('CreditDebitNote', creditDebitNoteSchema);
