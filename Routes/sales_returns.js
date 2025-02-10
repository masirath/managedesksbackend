const express = require("express");
const {
  create_sales_return,
  get_sales_return,
  get_all_sales_returns,
  update_sales_return,
  delete_sales_return,
  get_sales_return_log,
  get_all_sales_returns_log,
  get_all_sales_return_details,
  get_all_sales_returns_details,
} = require("../Controllers/sales_returns");
const sales_returns = express.Router();

sales_returns?.post("/api/create-sales-return", create_sales_return);
sales_returns?.post("/api/update-sales-return", update_sales_return);
sales_returns?.post("/api/delete-sales-return", delete_sales_return);
sales_returns?.post("/api/get-sales-return", get_sales_return);
sales_returns?.post("/api/get-all-sales-returns", get_all_sales_returns);
sales_returns?.post(
  "/api/get-all-sales_-eturns-details",
  get_all_sales_returns_details
);
sales_returns?.post(
  "/api/get-all-sales-return-details",
  get_all_sales_return_details
);
sales_returns?.post("/api/get-sales-return-log", get_sales_return_log);
sales_returns?.post(
  "/api/get-all-sales-returns-log",
  get_all_sales_returns_log
);

module.exports = sales_returns;
