const express = require("express");
const {
  create_purchase_order,
  get_purchase_order,
  get_all_purchase_orders,
  get_all_purchases_details,
  update_purchase_order,
  delete_purchase_order,
  get_purchase_log,
  get_all_purchases_log,
  get_all_purchase_details,
  get_purchase_order_inventories,
} = require("../Controllers/purchase_orders");
const purchase_orders = express.Router();

purchase_orders?.post("/api/create-purchase-order", create_purchase_order);
purchase_orders?.post("/api/update-purchase-order", update_purchase_order);
purchase_orders?.post("/api/delete-purchase-order", delete_purchase_order);
purchase_orders?.post("/api/get-purchase-order", get_purchase_order);
purchase_orders?.post(
  "/api/get-purchase-order-inventories",
  get_purchase_order_inventories
);
purchase_orders?.post("/api/get-all-purchase-orders", get_all_purchase_orders);
purchase_orders?.post(
  "/api/get-all-purchases-details",
  get_all_purchases_details
);
purchase_orders?.post(
  "/api/get-all-purchase-details",
  get_all_purchase_details
);
purchase_orders?.post("/api/get-purchase-log", get_purchase_log);
purchase_orders?.post("/api/get-all-purchases-log", get_all_purchases_log);

module.exports = purchase_orders;
