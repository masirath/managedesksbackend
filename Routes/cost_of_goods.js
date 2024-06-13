const express = require("express");
const {
  create_cost_of_goods,
  update_cost_of_goods,
  get_cost_of_goods,
  get_all_cost_of_goods,
} = require("../Controllers/cost_of_goods");
const cost_of_goods = express.Router();

cost_of_goods.post("/api/create-cost-of-goods", create_cost_of_goods);
cost_of_goods.post("/api/update-cost-of-goods", update_cost_of_goods);
cost_of_goods.get("/api/get-cost-of-goods/:id", get_cost_of_goods);
cost_of_goods.get("/api/get-all-cost-of-goods", get_all_cost_of_goods);

module.exports = cost_of_goods;
