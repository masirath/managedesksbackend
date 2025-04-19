// models/PeriodClosing.js
const mongoose = require("mongoose");

const ClosingEntrySchema = new mongoose.Schema({
  accountId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Account",
    required: true
  },
  debitAmount: {
    type: Number,
    default: 0
  },
  creditAmount: {
    type: Number,
    default: 0
  }
});

const PeriodClosingSchema = new mongoose.Schema({
  period: { 
    type: Date, // YYYY-MM-01 format
    required: true,
    unique: true
  },
  isClosed: {
    type: Boolean,
    default: false
  },
  closingEntries: [ClosingEntrySchema],
  closedAt: Date,
  closedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User"
  }
}, { timestamps: true });

// Prevent modifications after closing
PeriodClosingSchema.pre('save', function(next) {
  if (this.isModified('isClosed') && this.isClosed) {
    this.closedAt = new Date();
  }
  next();
});

module.exports = mongoose.model("PeriodClosing", PeriodClosingSchema);