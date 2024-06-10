const express = require("express");
const {
  create_cash_flow,
  update_cash_flow,
  get_cash_flow,
  get_all_cash_flow,
} = require("../Controllers/cash_flow");
const cash_flow = express.Router();

cash_flow.post("/api/create-cash-flow", create_cash_flow);
cash_flow.post("/api/update-cash-flow", update_cash_flow);
cash_flow.get("/api/get-cash-flow/:id", get_cash_flow);
cash_flow.get("/api/get-all-cash-flow", get_all_cash_flow);

module.exports = cash_flow;
