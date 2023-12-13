const express = require("express");
const {
  create_quotation,
  get_create_quotation,
  update_quotation,
  get_quotation,
  get_all_quotation,
} = require("../Controllers/quotations");
const quotations = express.Router();

quotations.get("/get-create-quotation", get_create_quotation);
quotations.post("/create-quotation", create_quotation);
quotations.post("/update-quotation", update_quotation);
quotations.get("/get-quotation/:id", get_quotation);
quotations.get("/get-all-quotation", get_all_quotation);

module.exports = quotations;
