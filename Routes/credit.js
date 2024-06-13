const express = require("express");
const {
  create_credit,
  update_credit,
  get_credit,
  get_all_credit,
} = require("../Controllers/credit");
const credit = express.Router();

credit.post("/api/create-credit", create_credit);
credit.post("/api/update-credit", update_credit);
credit.get("/api/get-credit/:id", get_credit);
credit.get("/api/get-all-credit", get_all_credit);

module.exports = credit;
