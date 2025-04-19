const express = require("express");
const {
  create_manual_journal,
  get_all_manual_journals,
  get_manual_journal,
  //update_manual_journal,
  delete_manual_journal
} = require("../Controllers/manualJournal");

const manualJournals = express.Router();

// Create a new manual journal entry
manualJournals.post("/api/create-manual-journal", create_manual_journal);

// Get all manual journal entries
manualJournals.get("/api/get-all-manual-journals", get_all_manual_journals);

// Get a specific manual journal entry by ID
manualJournals.get("/api/manual-journal/:id", get_manual_journal);

// Update a manual journal entry by ID
//manualJournals.put("/api/update-manual-journal/:id", update_manual_journal);

// Delete a manual journal entry by ID (Fixed: Added `/:id`)
manualJournals.delete("/api/delete-manual-journal/:id", delete_manual_journal);

module.exports = manualJournals;
