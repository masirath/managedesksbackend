const express = require("express");
const items = express.Router();
const {
  create_items,
  update_items,
  get_item,
  get_all_items,
} = require("../Controllers/items");

items.post("/api/create-item", create_items);
items.post("/api/update-item", update_items);
items.get("/api/get-item/:id", get_item);
items.get("/api/get-all-items", get_all_items);

module.exports = items;
