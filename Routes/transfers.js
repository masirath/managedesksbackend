const express = require("express");
const {
  create_transfer,
  get_transfer,
  get_all_transfers,
  update_transfer,
  delete_transfer,
  get_transfer_log,
  get_all_transfers_log,
  get_all_transfer_details,
  get_all_transfers_details,
} = require("../Controllers/transfers");
const transfers = express.Router();

transfers?.post("/api/create-transfer", create_transfer);
transfers?.post("/api/update-transfer", update_transfer);
transfers?.post("/api/delete-transfer", delete_transfer);
transfers?.post("/api/get-transfer", get_transfer);
transfers?.post("/api/get-all-transfers", get_all_transfers);
transfers?.post(
  "/api/get-all-purchases_-eturns-details",
  get_all_transfers_details
);
transfers?.post("/api/get-all-transfer-details", get_all_transfer_details);
transfers?.post("/api/get-transfer-log", get_transfer_log);
transfers?.post("/api/get-all-transfers-log", get_all_transfers_log);

module.exports = transfers;
