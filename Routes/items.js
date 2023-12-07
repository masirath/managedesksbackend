const express = require("express");
const items = express.Router();
const {
  create_items,
  update_items,
  get_item,
  get_all_items,
} = require("../Controllers/items");

items.post("/create-items", create_items);
items.post("/update-items", update_items);
items.get("/get-item/:id", get_item);
items.get("/get-al-items", get_all_items);

module.exports = items;
