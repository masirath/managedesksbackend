const express = require("express");
const {
  create_supplier,
  update_supplier,
  get_supplier,
  get_all_suppliers,
} = require("../Controllers/suppliers");
const suppliers = express.Router();

suppliers.post("/api/create-supplier", create_supplier);
suppliers.post("/api/update-supplier", update_supplier);
suppliers.get("/api/get-supplier/:id", get_supplier);
suppliers.get("/api/get-all-suppliers", get_all_suppliers);

module.exports = suppliers;
