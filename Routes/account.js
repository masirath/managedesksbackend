const express = require("express");
const {
  create_account,
  update_account,
  get_all_accounts,
  get_account,
  update_balances_from_journal, // ✅ Import new function
} = require("../Controllers/account");

const accounts = express.Router();

accounts.post("/api/create-account", create_account);
accounts.post("/account", get_account);
accounts.put("/api/update-account/:id", update_account); // Use PUT for updates
accounts.get("/api/get-all-accounts", get_all_accounts);

// ✅ New route to update balances based on journal entry
accounts.post("/api/update-balances-from-journal", update_balances_from_journal);

module.exports = accounts;
