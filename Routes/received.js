const express = require("express");
const {
  create_receive,
  get_receive,
  get_all_received,
  get_all_purchases_details,
  update_receive,
  delete_receive,
  get_purchase_log,
  get_all_purchases_log,
  get_all_purchase_details,
  get_receive_inventories,
} = require("../Controllers/received");
const received = express.Router();

received?.post("/api/create-receive", create_receive);
received?.post("/api/update-receive", update_receive);
received?.post("/api/delete-receive", delete_receive);
received?.post("/api/get-receive", get_receive);
received?.post("/api/get-receive-inventories", get_receive_inventories);
received?.post("/api/get-all-received", get_all_received);
received?.post("/api/get-all-purchases-details", get_all_purchases_details);
received?.post("/api/get-all-purchase-details", get_all_purchase_details);
received?.post("/api/get-purchase-log", get_purchase_log);
received?.post("/api/get-all-purchases-log", get_all_purchases_log);

module.exports = received;
