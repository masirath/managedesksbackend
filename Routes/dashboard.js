const express = require("express");
const {
  get_dashboard,
  get_all_products_reports,
  get_all_products_low_reports,
  get_all_products_out_of_stock_reports,
  get_all_inventories_reports,
  get_all_inventories_near_expiry_reports,
  get_all_inventories_expired_reports,
  get_sales_reports,
  get_purchase_reports,
} = require("../Controllers/dashboard");
const dashboard = express.Router();

dashboard.post("/api/get-dashboard", get_dashboard);

dashboard.post("/api/get-all-products-reports", get_all_products_reports);
dashboard.post(
  "/api/get-all-products-low-reports",
  get_all_products_low_reports
);
dashboard.post(
  "/api/get-all-products-out-of-stock-reports",
  get_all_products_out_of_stock_reports
);

dashboard.post("/api/get-all-inventories-reports", get_all_inventories_reports);
dashboard.post(
  "/api/get-all-inventories-near-expiry-reports",
  get_all_inventories_near_expiry_reports
);
dashboard.post(
  "/api/get-all-inventories-expired-reports",
  get_all_inventories_expired_reports
);

dashboard.post("/api/get-sales-reports", get_sales_reports);

dashboard.post("/api/get-purchase-reports", get_purchase_reports);

module.exports = dashboard;
