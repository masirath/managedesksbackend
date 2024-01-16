const express = require("express");
const deliveries = express.Router();
const {
  create_deliveries,
  get_create_deliveries,
  update_deliveries,
  get_deliveries,
  get_all_deliveries,
} = require("../Controllers/deliveries");

deliveries.get("/api/get-create-deliveries/:id", get_create_deliveries);
deliveries.post("/api/create-deliveries", create_deliveries);
deliveries.post("/api/update-deliveries", update_deliveries);
deliveries.get("/api/get-deliveries/:id", get_deliveries);
deliveries.get("/api/get-all-deliveries", get_all_deliveries);

module.exports = deliveries;
