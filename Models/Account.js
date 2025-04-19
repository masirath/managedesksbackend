const mongoose = require("mongoose");
const accountTypes = [
  "Bank & Cash",
  "Current Asset",
  "Depreciation",
  "Fixed Asset",
  "Inventory",
  "Non-current Asset",
  "Prepayment",
  "Equity",
  "Revenue",
  "Expense",
  "Direct Costs",
  "Income",
  "sales revenue",
  "expense",
  "direct expense",
  "Current Liability",
  "Liability",
  "Non-current Liability",
];

const accountCategories = ["Assets", "Liabilities", "Equity", "Expenses", "Income"];

const AccountSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Account name (e.g Accounts Receivable, Account Payable)
  code: { type: String, required: true, unique: true }, // Account code (120, 140)
  type: { type: String, required: true, enum: accountTypes }, // Specific account type
  category: { type: String, required: true, enum: accountCategories }, // Broad category
  balance: { type: Number, default: 0 }, // Account balance (default to $0.00)
  branch: { type: String, default: "Main" }, // Branch associated with the account
  description: { type: String, default: "" }, // Description of the account
  currency: { type: String, default: "OMR" }, // Currency (default to OMR)
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" }, // Account status
  createdAt: { type: Date, default: Date.now }, // Timestamp when the account was created

  // Add these new fields for hierarchy and tracking
  parentAccount: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    default: null
  },
  // isHeader: { 
  //   type: Boolean, 
  //   default: false 
  // },
  balanceHistory: [{
    date: Date,
    balance: Number,
    currency: String
  }],
  depth: {
    type: Number,
    default: 0
  }

});

// Replace the existing updateBalance method with this enhanced version
AccountSchema.statics.updateBalances = async function(journalEntry) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Process all entries in transaction
    for (const entry of journalEntry.entries) {
      const account = await this.findById(entry.account).session(session);
      if (!account) continue;

      // Calculate balance change based on entry type and category
      const amount = entry.type === 'debit' ? entry.amount : -entry.amount;
      const balanceChange = ["Assets", "Expenses"].includes(account.category) 
        ? amount 
        : -amount;

      // Update account balance
      account.balance += balanceChange;
      
      // Update balance history
      account.balanceHistory.push({
        date: new Date(),
        balance: account.balance,
        currency: account.currency
      });

      await account.save({ session });

      // Propagate changes to parent accounts
      let parent = account.parentAccount;
      while (parent) {
        const parentAccount = await this.findById(parent).session(session);
        parentAccount.balance += balanceChange;
        await parentAccount.save({ session });
        parent = parentAccount.parentAccount;
      }
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Add validation for account hierarchy
// AccountSchema.pre('save', function(next) {
//   if (this.parentAccount) {
//     // Validate code structure (child code should start with parent code)
//     const parentCode = this.parentAccount.code;
//     if (!this.code.startsWith(parentCode)) {
//       return next(new Error(`Child account code ${this.code} must start with parent code ${parentCode}`));
//     }
    
//     // Auto-calculate depth
//     this.depth = this.parentAccount.depth + 1;
//   }

//   // Header accounts must have 0 balance
//   if (this.isHeader && this.balance !== 0) {
//     return next(new Error("Header accounts must have 0 balance"));
//   }

//   next();
// });



AccountSchema.pre('save', async function(next) {
  if (this.parentAccount) {
    // Populate the parent account to validate the code structure
    const parentAccount = await this.model('Account').findById(this.parentAccount).exec();
    
    if (!parentAccount) {
      return next(new Error("Parent account does not exist"));
    }

    // Validate code structure (child code should start with parent code)
    const parentCode = parentAccount.code;
    if (!this.code.startsWith(parentCode)) {
      return next(new Error(`Child account code ${this.code} must start with parent code ${parentCode}`));
    }

    // Auto-calculate depth
    this.depth = parentAccount.depth + 1;
  }

  // Header accounts must have 0 balance
  // if (this.isHeader && this.balance !== 0) {
  //   return next(new Error("Header accounts must have 0 balance"));
  // }

  next();
});


module.exports = mongoose.model("Account", AccountSchema);