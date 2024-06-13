const express = require("express");
const {
  create_credit_note,
  update_credit_note,
  get_credit_note,
  get_all_credit_note,
} = require("../Controllers/credit_note");
const credit_note = express.Router();

credit_note?.post("/api/create-credit-note", create_credit_note);
credit_note?.post("/api/update-credit-note", update_credit_note);
credit_note?.get("/api/get-credit-note/:id", get_credit_note);
credit_note?.get("/api/get-all-credit-note", get_all_credit_note);

module.exports = credit_note;
