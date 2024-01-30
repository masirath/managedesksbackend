const express = require("express");
const purchases = express.Router();
const {
  get_create_purchase,
  create_purchase,
} = require("../Controllers/purchases");

purchases.post("/api/get-create-purchase", get_create_purchase);
purchases.post("/api/create-purchase", create_purchase);

module.exports = purchases;
