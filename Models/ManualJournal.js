const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema({
  url: { type: String, required: true }, // Path to the uploaded file
  type: { 
    type: String, 
    enum: ['invoice', 'receipt', 'payment', 'supporting', 'other'],
    default: 'supporting'
  },
  name: { type: String, required: true }, // Original filename
  size: { type: Number }, // File size in bytes
  uploadedAt: { type: Date, default: Date.now },
  description: { type: String }
});

const JournalEntrySchema = new mongoose.Schema({
  entryId: { 
    type: String, 
    unique: true,
    default: () => `JE-${Date.now().toString(36).toUpperCase()}` // Auto-generate ID
  },
  date: { 
    type: Date, 
    default: Date.now,
    required: [true, 'Journal date is required']
  },
  description: { 
    type: String, 
    required: [true, 'Description is required'],
    trim: true
  },
  referenceNumber: { 
    type: String, 
    required: [true, 'Reference number is required'],
    trim: true,
    unique: true,
    uppercase: true
  },
  status: {
    type: String,
    enum: ['draft', 'posted', 'approved', 'rejected', 'reversed'],
    default: 'posted'
  },
  documents: [DocumentSchema],
  entries: [{
    account: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Account", 
      required: [true, 'Account is required for each entry']
    },
    amount: { 
      type: Number, 
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be at least 0.01'],
      set: v => parseFloat(v.toFixed(2)) // Ensure 2 decimal places
    },
    type: {
      type: String,
      enum: {
        values: ['debit', 'credit'],
        message: 'Entry type must be either debit or credit'
      },
      required: [true, 'Entry type is required']
    },
    reference: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    lineId: {
      type: String,
      default: function() {
        return `${this.type === 'debit' ? 'DR' : 'CR'}-${Date.now().toString().slice(-6)}`;
      }
    }
  }],
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  validateBeforeSave: true // Ensure validations run before saving
});

// Pre-validation middleware
JournalEntrySchema.pre('validate', function(next) {
  // Clean up strings
  this.description = this.description?.trim();
  this.referenceNumber = this.referenceNumber?.trim().toUpperCase();
  
  // Clean entry references and descriptions
  if (this.entries) {
    this.entries.forEach(entry => {
      entry.reference = entry.reference?.trim();
      entry.description = entry.description?.trim();
    });
  }

  // Validate minimum entries
  if (!this.entries || this.entries.length < 2) {
    this.invalidate('entries', 'Must have at least 2 entries (1 debit and 1 credit)');
  }

  next();
});


// Virtual for total debits
JournalEntrySchema.virtual('totalDebits').get(function() {
  return this.entries
    .filter(e => e.type === 'debit')
    .reduce((sum, entry) => sum + entry.amount, 0);
});

// Virtual for total credits
JournalEntrySchema.virtual('totalCredits').get(function() {
  return this.entries
    .filter(e => e.type === 'credit')
    .reduce((sum, entry) => sum + entry.amount, 0);
});

// Validation to ensure debits = credits
JournalEntrySchema.pre('validate', function(next) {
  if (Math.abs(this.totalDebits - this.totalCredits) > 0.01) {
    this.invalidate('entries', 'Total debits must equal total credits', this.entries);
  }
  next();
});

// Update account balances after saving
JournalEntrySchema.post('save', async function(doc) {
  const Account = mongoose.model("Account");
  
  for (const entry of doc.entries) {
    const account = await Account.findById(entry.account);
    if (!account) continue;

    // Calculate new balance based on entry type and account category
    let balanceChange = entry.amount;
    if ((entry.type === 'debit' && ['Assets', 'Expenses'].includes(account.category)) ||
        (entry.type === 'credit' && ['Liabilities', 'Equity', 'Income'].includes(account.category))) {
      account.balance += balanceChange;
    } else {
      account.balance -= balanceChange;
    }

    await account.save();
  }
});

module.exports = mongoose.model("ManualJournal", JournalEntrySchema);