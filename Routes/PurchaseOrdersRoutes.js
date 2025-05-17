const express = require("express");
//const { get_purchase_order_with_delivered_items } = require("../../Controllers/PurchaseOrders/getPurchaseOrderWithDeliveredItems");
const {get_purchase_order_with_delivered_items} = require("../../managedesksbackend/Controllers/PurchaseOrders/index")
const PurchaseOrdersDeliveredController = express.Router();

// 🆕 Add this new route
PurchaseOrdersDeliveredController.post("/get-delivered", get_purchase_order_with_delivered_items);

module.exports = PurchaseOrdersDeliveredController;
