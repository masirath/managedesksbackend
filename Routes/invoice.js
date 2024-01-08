const express = require("express");
const invoice = express.Router();
const {
  get_create_invoice,
  create_invoice,
  update_invoice,
  get_invoice,
  get_all_invoice,
  create_invoice_payment,
  update_invoice_payment,
} = require("../Controllers/invoice");

invoice.get("/get-create-invoice", get_create_invoice);
invoice.post("/create-invoice", create_invoice);
invoice.post("/update-invoice", update_invoice);
invoice.get("/get-invoice/:id", get_invoice);
invoice.post("/get-all-invoice", get_all_invoice);
invoice.post("/create-invoice-payment", create_invoice_payment);
invoice.post("/update-invoice-payment", update_invoice_payment);

module.exports = invoice;
