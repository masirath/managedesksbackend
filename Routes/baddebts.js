const express = require("express");
const {
  create_bad_debts,
  update_bad_debts,
  get_bad_debts,
  get_all_bad_debts,
} = require("../Controllers/baddebts");
const bad_debts = express.Router();

bad_debts.post("/api/create-bad-debts", create_bad_debts);
bad_debts.post("/api/update-bad-debts", update_bad_debts);
bad_debts.get("/api/get-bad-debts/:id", get_bad_debts);
bad_debts.get("/api/get-all-bad-debts", get_all_bad_debts);

module.exports = bad_debts;
