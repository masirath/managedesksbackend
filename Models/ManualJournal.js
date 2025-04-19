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
      default: function () {
        return `${this.type === 'debit' ? 'DR' : 'CR'}-${Date.now().toString().slice(-6)}`;
      }
    }
  }],
  created_by: {    //here modify with createdBy for future checkin 
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
JournalEntrySchema.pre('validate', function (next) {
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
JournalEntrySchema.virtual('totalDebits').get(function () {
  return this.entries
    .filter(e => e.type === 'debit')
    .reduce((sum, entry) => sum + entry.amount, 0);
});

// Virtual for total credits
JournalEntrySchema.virtual('totalCredits').get(function () {
  return this.entries
    .filter(e => e.type === 'credit')
    .reduce((sum, entry) => sum + entry.amount, 0);
});

// Validation to ensure debits = credits
JournalEntrySchema.pre('validate', function (next) {
  if (Math.abs(this.totalDebits - this.totalCredits) > 0.01) {
    this.invalidate('entries', 'Total debits must equal total credits', this.entries);
  }
  next();
});

JournalEntrySchema.post('save', async function (doc) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const Transaction = mongoose.model("Transaction");
    const Account = mongoose.model("Account");

    // Process all entries in transaction
    for (const entry of doc.entries) {
      const account = await Account.findById(entry.account).session(session);
      if (!account) {
        console.warn(`Account ${entry.account} not found for journal entry ${doc._id}`);
        continue;
      }

      // ===== 1. Update Account Balance =====
      const amount = Number(entry.amount) || 0;
      const isDebit = entry.type === 'debit';

      // Determine balance change direction
      let balanceChange = amount;
      if ((isDebit && ['Assets', 'Expenses'].includes(account.category)) ||
        (!isDebit && ['Liabilities', 'Equity', 'Income'].includes(account.category))) {
        // Normal balance increase
        account.balance += balanceChange;
      } else {
        // Normal balance decrease
        account.balance -= balanceChange;
      }

      // Ensure balance doesn't go negative for asset/expense accounts
      if (['Assets', 'Expenses'].includes(account.category) && account.balance < 0) {
        throw new Error(`Negative balance not allowed for ${account.name} (${account.code})`);
      }

      // Update balance history
      account.balanceHistory = account.balanceHistory || [];
      account.balanceHistory.push({
        date: new Date(),
        balance: account.balance,
        currency: account.currency,
        journalEntry: doc._id
      });

      await account.save({ session });

      // ===== 2. Create Transaction Record =====
      const period = new Date(doc.date.getFullYear(), doc.date.getMonth(), 1);

      await Transaction.create([{
        journalEntryId: doc._id,
        accountId: account._id,
        date: doc.date,
        amount: amount,
        entryType: entry.type,   // changed for error type to entryType
        period: period,
        category: account.category,
        accountType: account.type,
        reference: entry.reference || doc.referenceNumber,
        description: entry.description || doc.description,
        isReconciled: false


      }], { session });

      // ===== 3. Update Parent Account Balances =====
      let parent = account.parentAccount;
      while (parent) {
        const parentAccount = await Account.findById(parent).session(session);
        if (!parentAccount) break;

        parentAccount.balance += balanceChange;
        await parentAccount.save({ session });
        parent = parentAccount.parentAccount;
      }

      // ===== 4. Update Profit & Loss Summary =====
      const ProfitLossSummary = mongoose.model("ProfitLossSummary");
      const profitLossByCategory = await Transaction.aggregate([
        { $match: { journalEntryId: doc._id } },
        {
          $group: {
            _id: "$category",
            total: { $sum: "$amount" }
          }
        }
      ]);

      for (const item of profitLossByCategory) {
        const category = item._id; // e.g., "Income", "Expenses"
        const total = item.total;

        await ProfitLossSummary.findOneAndUpdate(
          { period: period, category },
          {
            $inc: { total: total },
            $setOnInsert: { period: period, createdAt: new Date() }
          },
          { upsert: true, new: true, session }
        );
      }

    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    console.error(`Failed to process journal entry ${doc._id}:`, error);
    // Consider adding error notification system here
  } finally {
    session.endSession();
  }
});
module.exports = mongoose.model("ManualJournal", JournalEntrySchema, "manualJournals");