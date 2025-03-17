const express = require("express");
const {
  create_product,
  update_product,
  delete_product,
  get_product,
  get_all_products,
  get_product_log,
  get_all_products_log,
  get_product_barcode,
  get_product_name,
} = require("../Controllers/products");
const products = express.Router();

products.post("/api/create-product", create_product);
products.post("/api/update-product", update_product);
products.post("/api/delete-product", delete_product);
products.post("/api/get-product", get_product);
products.post("/api/get-product-name", get_product_name);
products.post("/api/get-all-products", get_all_products);
products.post("/api/get_product_log", get_product_log);
products.post("/api/get_all_products_log", get_all_products_log);
products.post("/api/get-product-barcode", get_product_barcode);

module.exports = products;
