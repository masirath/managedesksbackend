const mongoose = require("mongoose");

// const GeneralLedgerSchema = new mongoose.Schema({
//   journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: "ManualJournal", required: true }, // Reference to the ManualJournal entry
//   account: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true }, // Reference to the Account model
//   debit: { type: Number, default: 0 }, // Debit amount
//   credit: { type: Number, default: 0 }, // Credit amount
//   balance: { type: Number, default: 0 }, // Running balance for the account
//   date: { type: Date, default: Date.now }, // Date of the transaction
//   createdAt: { type: Date, default: Date.now }, // Timestamp of creation
// });



const GeneralLedgerSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now }, // Date of the transaction
  account_code: { type: String, required: true }, // Account code from the Chart of Accounts
  account_name: { type: String, required: true }, // Account name from the Chart of Accounts
  description: { type: String, default: "" }, // Description of the transaction
  debit: { type: Number, default: null }, // Debit amount (nullable if credit is filled)
  credit: { type: Number, default: null }, // Credit amount (nullable if debit is filled)
  reference_number: { type: String, default: "" }, // Reference number (e.g., invoice number)
  supporting_docs: { type: String, default: "" }, // Attached supporting documents (file path or URL)
  journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: "ManualJournal", required: true }, // Reference to the ManualJournal entry
  account: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true }, // Reference to the Account model
  balance: { type: Number, default: 0 }, // Running balance for the account
  createdAt: { type: Date, default: Date.now }, // Timestamp of creation
});


module.exports = mongoose.model("GeneralLedger", GeneralLedgerSchema);