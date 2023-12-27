const express = require("express");
const deliveries = express.Router();
const {
  create_deliveries,
  get_create_deliveries,
} = require("../Controllers/deliveries");

deliveries.post("/create-deliveries", create_deliveries);
deliveries.get("/get-create-deliveries/:id", get_create_deliveries);

module.exports = deliveries;
