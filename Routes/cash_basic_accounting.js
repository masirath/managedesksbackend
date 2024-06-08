const express = require("express");
const {
  create_cash_basic_accounting,
  update_cash_basic_accounting,
  get_cash_basic_accounting,
  get_all_cash_basic_accounting,
} = require("../Controllers/cash_basic_accounting");
const cash_basic_accounting = express?.Router();

cash_basic_accounting.post(
  "/api/create-cash-basic-accounting",
  create_cash_basic_accounting
);
cash_basic_accounting.post(
  "/api/update-cash-basic-accounting",
  update_cash_basic_accounting
);
cash_basic_accounting.get(
  "/api/get-cash-basic-accounting/:id",
  get_cash_basic_accounting
);
cash_basic_accounting.get(
  "/api/get-all-cash-basic-accounting",
  get_all_cash_basic_accounting
);

module.exports = cash_basic_accounting;
