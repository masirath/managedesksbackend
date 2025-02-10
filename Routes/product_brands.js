const express = require("express");
const {
  create_product_brand,
  update_product_brand,
  delete_product_brand,
  get_product_brand,
  get_all_product_brands,
  get_product_brand_log,
  get_all_product_brand_logs,
} = require("../Controllers/product_brands");
const product_brands = express.Router();

product_brands.post("/api/create-product-brand", create_product_brand);
product_brands.post("/api/update-product-brand", update_product_brand);
product_brands.post("/api/delete-product-brand", delete_product_brand);
product_brands.post("/api/get-product-brand", get_product_brand);
product_brands.post("/api/get-all-product-brands", get_all_product_brands);
product_brands.post("/api/get-product-brand-log", get_product_brand_log);
product_brands.post(
  "/api/get-all-product-brand-logs",
  get_all_product_brand_logs
);

module.exports = product_brands;
