const express = require("express");
const {
  create_supplier,
  update_supplier,
  delete_supplier,
  get_supplier,
  get_all_suppliers,
  get_supplier_log,
  get_all_supplier_category,
  create_supplier_category,
  update_supplier_category,
  get_supplier_category,
  get_all_suppliers_log,
  get_all_supplier_category_log,
  get_supplier_category_log,
  delete_supplier_category,
} = require("../Controllers/suppliers");
const suppliers = express.Router();

suppliers.post("/api/create-supplier", create_supplier);
suppliers.post("/api/update-supplier", update_supplier);
suppliers.post("/api/delete-supplier", delete_supplier);
suppliers.get("/api/get-supplier/:id", get_supplier);
suppliers.post("/api/get-all-suppliers", get_all_suppliers);
suppliers.get("/api/get-supplier-log", get_supplier_log);
suppliers.get("/api/get-all-suppliers-log", get_all_suppliers_log);

module.exports = suppliers;
