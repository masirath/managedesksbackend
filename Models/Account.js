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
  "sales revenue",
  "expense",
  "direct expense",
  "Current Liability",
  "Liability",
  "Non-current Liability",
];

const accountCategories = ["Assets", "Liabilities", "Equity", "Expenses", "Income"];

const AccountSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Account name (Accounts Receivable)
  code: { type: String, required: true, unique: true }, // Account code (120, 140)
  type: { type: String, required: true, enum: accountTypes }, // Specific account type
  category: { type: String, required: true, enum: accountCategories }, // Broad category
  balance: { type: Number, default: 0 }, // Account balance (default to $0.00)
  branch: { type: String, default: "Main" }, // Branch associated with the account
  description: { type: String, default: "" }, // Description of the account
  currency: { type: String, default: "OMR" }, // Currency (default to OMR)
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" }, // Account status
  createdAt: { type: Date, default: Date.now }, // Timestamp when the account was created
});

// Update the balance when a journal entry is posted
// AccountSchema.statics.updateBalance = async function (entryId) {
//   const journalEntry = await mongoose.model("ManualJournal").findOne({ entryId }).populate('debits.account credits.account');
  
//   // Process debits and credits
//   for (let debit of journalEntry.debits) {
//     const account = debit.account;
//     account.balance += debit.amount;  // Increase balance for debits
//     await account.save();
//   }

//   for (let credit of journalEntry.credits) {
//     const account = credit.account;
//     account.balance -= credit.amount;  // Decrease balance for credits
//     await account.save();
//   }
// };

AccountSchema.statics.updateBalance = async function (entryId) {
  const journalEntry = await mongoose.model("ManualJournal").findOne({ entryId }).populate('debits.account credits.account');
  
  // Process debits
  for (let debit of journalEntry.debits) {
    const account = debit.account;
    if (account.category === "Assets" || account.category === "Expenses") {
      account.balance += debit.amount;  // Increase for Assets/Expenses
    } else {
      account.balance -= debit.amount;  // Decrease for Liabilities/Equity/Income
    }
    await account.save();
  }

  // Process credits
  for (let credit of journalEntry.credits) {
    const account = credit.account;
    if (account.category === "Assets" || account.category === "Expenses") {
      account.balance -= credit.amount;  // Decrease for Assets/Expenses
    } else {
      account.balance += credit.amount;  // Increase for Liabilities/Equity/Income
    }
    await account.save();
  }
};

module.exports = mongoose.model("Account", AccountSchema);