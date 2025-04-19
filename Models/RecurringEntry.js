const mongoose = require("mongoose");

// Check if the model already exists
if (mongoose.models.RecurringEntry) {
  module.exports = mongoose.model("RecurringEntry");
} else {
  const RecurringEntrySchema = new mongoose.Schema({
    frequency: { type: String, enum: ['Daily', 'Weekly', 'Monthly'], required: true },
    nextDate: { type: Date, required: true },
    journalEntry: { type: mongoose.Schema.Types.ObjectId, ref: 'ManualJournal', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  }, { timestamps: true });

  module.exports = mongoose.model("RecurringEntry", RecurringEntrySchema);
}
