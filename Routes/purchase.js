const express = require("express");
const purchases = express.Router();
const {
  get_create_purchase,
  create_purchase,
  update_purchase,
  get_purchase,
  get_all_purchases,
} = require("../Controllers/purchases");

purchases.get("/api/get-create-purchase", get_create_purchase);
purchases.post("/api/create-purchase", create_purchase);
purchases.post("/api/update-purchase", update_purchase);
purchases.get("/api/get-purchase/:id", get_purchase);
purchases.get("/api/get-all-purchases", get_all_purchases);

module.exports = purchases;
