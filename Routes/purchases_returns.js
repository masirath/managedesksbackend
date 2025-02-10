const express = require("express");
const {
  create_purchases_return,
  get_purchases_return,
  get_all_purchases_returns,
  update_purchases_return,
  delete_purchases_return,
  get_purchases_return_log,
  get_all_purchases_returns_log,
  get_all_purchases_return_details,
  get_all_purchases_returns_details,
} = require("../Controllers/purchases_returns");
const purchases_returns = express.Router();

purchases_returns?.post(
  "/api/create-purchases-return",
  create_purchases_return
);
purchases_returns?.post(
  "/api/update-purchases-return",
  update_purchases_return
);
purchases_returns?.post(
  "/api/delete-purchases-return",
  delete_purchases_return
);
purchases_returns?.post("/api/get-purchases-return", get_purchases_return);
purchases_returns?.post(
  "/api/get-all-purchases-returns",
  get_all_purchases_returns
);
purchases_returns?.post(
  "/api/get-all-purchases_-eturns-details",
  get_all_purchases_returns_details
);
purchases_returns?.post(
  "/api/get-all-purchases-return-details",
  get_all_purchases_return_details
);
purchases_returns?.post(
  "/api/get-purchases-return-log",
  get_purchases_return_log
);
purchases_returns?.post(
  "/api/get-all-purchases-returns-log",
  get_all_purchases_returns_log
);

module.exports = purchases_returns;
