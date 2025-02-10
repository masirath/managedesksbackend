const express = require("express");
const {
  create_product_category,
  update_product_category,
  delete_product_category,
  get_product_category,
  get_all_product_categories,
  get_product_category_log,
  get_all_product_category_logs,
} = require("../Controllers/product_categories");
const product_categories = express.Router();

product_categories.post(
  "/api/create-product-category",
  create_product_category
);
product_categories.post(
  "/api/update-product-category",
  update_product_category
);
product_categories.post(
  "/api/delete-product-category",
  delete_product_category
);
product_categories.post("/api/get-product-category", get_product_category);
product_categories.post(
  "/api/get-all-product-categories",
  get_all_product_categories
);
product_categories.post(
  "/api/get-product-category-log",
  get_product_category_log
);
product_categories.post(
  "/api/get-all-product-category-logs",
  get_all_product_category_logs
);

module.exports = product_categories;
