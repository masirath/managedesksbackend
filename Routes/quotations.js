const express = require("express");
const {
  create_quotation,
  get_create_quotation,
} = require("../Controllers/quotations");
const quotations = express.Router();

quotations.get("/get-create-quotation", get_create_quotation);
quotations.post("/create-quotations", create_quotation);

module.exports = quotations;
