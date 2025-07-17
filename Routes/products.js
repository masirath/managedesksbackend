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
  get_all_unavailable_products,
  create_bulk_product,
  download_all_products_reports_csv,
  create_products_csv,
} = require("../Controllers/products");
const products = express.Router();
const multer = require("multer");
const path = require("path");

products.post("/api/create-product", create_product);
products.post("/api/update-product", update_product);
products.post("/api/delete-product", delete_product);
products.post("/api/get-product", get_product);
products.post("/api/get-product-name", get_product_name);
products.post("/api/get-all-products", get_all_products);
products.post("/api/get_product_log", get_product_log);
products.post("/api/get_all_products_log", get_all_products_log);
products.post("/api/get-product-barcode", get_product_barcode);
products.post(
  "/api/get-all-unavailable-products",
  get_all_unavailable_products
);
products.post("/api/create-bulk-product", create_bulk_product);
products.post(
  "/api/download-all-products-reports-csv",
  download_all_products_reports_csv
);

const storage = multer.diskStorage({
  destination: "uploads/products",
  filename: (_, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

products.post(
  "/api/create-products-csv",
  upload.single("file"),
  create_products_csv
);

module.exports = products;
