const express = require("express");
const {
  create_inventory,
  update_inventory,
  delete_inventory,
  get_inventory,
  get_all_inventories,
  get_inventory_log,
  get_all_inventories_log,
  get_inventory_barcode,
} = require("../Controllers/inventories");
const inventories = express.Router();

inventories.post("/api/create-inventory", create_inventory);
inventories.post("/api/update-inventory", update_inventory);
inventories.post("/api/delete-inventory", delete_inventory);
inventories.post("/api/get-inventory", get_inventory);
inventories.post("/api/get-all-inventories", get_all_inventories);
inventories.post("/api/get_inventory_log", get_inventory_log);
inventories.post("/api/get_all_inventories_log", get_all_inventories_log);
inventories.post("/api/get-inventory-barcode", get_inventory_barcode);

module.exports = inventories;
