const express = require("express");
const {
  create_invoice,
  get_invoice,
  get_all_invoices,
  update_invoice,
  delete_invoice,
  get_invoice_log,
  get_all_invoices_log,
  get_all_invoice_details,
  get_all_invoices_details,
} = require("../Controllers/invoices");
const invoices = express.Router();

invoices?.post("/api/create-invoice", create_invoice);
invoices?.post("/api/update-invoice", update_invoice);
invoices?.post("/api/delete-invoice", delete_invoice);
invoices?.post("/api/get-invoice", get_invoice);
invoices?.post("/api/get-all-invoices", get_all_invoices);
invoices?.post("/api/get-all-invoices-details", get_all_invoices_details);
invoices?.post("/api/get-all-invoice-details", get_all_invoice_details);
invoices?.post("/api/get-invoice-log", get_invoice_log);
invoices?.post("/api/get-all-invoices-log", get_all_invoices_log);

module.exports = invoices;
