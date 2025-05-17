const mongoose = require("mongoose");

const PurchaseItemSchema = new mongoose.Schema({
  description: String,
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  vatRate: { type: Number, required: true }, // e.g. 5, 0, etc.
  billReference: { type: String, default: null },
  adjustedAmount: { type: Number, default: 0 },
});

const VatSummarySchema = new mongoose.Schema({
  rate: { type: Number },
  amount: { type: Number },
});

const PurchaseVoucherSchema = new mongoose.Schema({
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "contacts",
    required: true,
  },

  voucherDate: { type: Date, required: true },
  dueDate: { type: Date },
  referenceNumber: { type: String },
  items: [PurchaseItemSchema],

  subTotal: { type: Number, required: true },
  vatTotal: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  vatSummary: [VatSummarySchema],

  billAdjustments: [
    {
      billReference: String,
      adjustedAmount: Number,
    },
  ],

  notes: String,

  // Standard fields
  status: {
    required: true,
    type: Number,
    default: 1,
  },
  ref: {
    required: true,
    type: Number,
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "branches",
  },
  created: {
    required: true,
    type: Date,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
});

module.exports = mongoose.model("PurchaseVoucher", PurchaseVoucherSchema);
