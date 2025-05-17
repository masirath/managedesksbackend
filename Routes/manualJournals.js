const express = require("express");
const {
  create_manual_journal,
  get_all_manual_journals,
  get_manual_journal,
  //update_manual_journal,
  delete_manual_journal,
  create_contra_entry,
  get_contra_balance
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


// Create a contra entry (offset AR/AP balances)
manualJournals.post("/api/contra-entry", create_contra_entry); // Add this route

// Get net balance for a specific counterparty
manualJournals.get("/api/contra-balance/:contactId", get_contra_balance); // Add this route

module.exports = manualJournals;
