const express = require("express");
const {
  create_closing_balance,
  update_closing_balance,
  get_closing_balance,
  get_all_closing_balance,
} = require("../Controllers/closing_balance");
const closing_balance = express.Router();

closing_balance.post("/api/create-closing-balance", create_closing_balance);
closing_balance.post("/api/update-closing-balance", update_closing_balance);
closing_balance.get("/api/get-closing-balance/:id", get_closing_balance);
closing_balance.get("/api/get-all-closing-balance", get_all_closing_balance);

module.exports = closing_balance;
