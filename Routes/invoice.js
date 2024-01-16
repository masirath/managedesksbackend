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

invoice.get("/api/get-create-invoice", get_create_invoice);
invoice.post("/api/create-invoice", create_invoice);
invoice.post("/api/update-invoice", update_invoice);
invoice.get("/api/get-invoice/:id", get_invoice);
invoice.get("/api/get-all-invoice", get_all_invoice);
invoice.post("/api/create-invoice-payment", create_invoice_payment);
invoice.post("/api/update-invoice-payment", update_invoice_payment);

module.exports = invoice;
