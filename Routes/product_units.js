const express = require("express");
const {
  create_product_unit,
  update_product_unit,
  delete_product_unit,
  get_product_unit,
  get_all_product_units,
  get_product_unit_log,
  get_all_product_unit_logs,
} = require("../Controllers/product_units");
const product_units = express.Router();

product_units.post("/api/create-product-unit", create_product_unit);
product_units.post("/api/update-product-unit", update_product_unit);
product_units.post("/api/delete-product-unit", delete_product_unit);
product_units.post("/api/get-product-unit", get_product_unit);
product_units.post("/api/get-all-product-units", get_all_product_units);
product_units.post("/api/get-product-unit-log", get_product_unit_log);
product_units.post("/api/get-all-product-unit-logs", get_all_product_unit_logs);

module.exports = product_units;
