const express = require("express");
const {
  create_accrual,
  update_accrual,
  get_accrual,
  get_all_accrual,
} = require("../Controllers/accrual");
const accrual = express.Router();

accrual.post("/api/create-accrual", create_accrual);
accrual.post("/api/update-accrual", update_accrual);
accrual.get("/api/get-accrual/:id", get_accrual);
accrual.get("/api/get-all-accrual", get_all_accrual);

module.exports = accrual;
