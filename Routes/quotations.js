const express = require("express");
const {
  create_quotation,
  get_create_quotation,
  update_quotation,
  get_quotation,
  get_all_quotation,
  order_quotation,
} = require("../Controllers/quotations");
const quotations = express.Router();

quotations.get("/api/get-create-quotation", get_create_quotation);
quotations.post("/api/create-quotation", create_quotation);
quotations.post("/api/update-quotation", update_quotation);
quotations.get("/api/get-quotation/:id", get_quotation);
quotations.get("/api/get-all-quotation", get_all_quotation);
quotations.post("/api/order-quotation", order_quotation);

module.exports = quotations;
