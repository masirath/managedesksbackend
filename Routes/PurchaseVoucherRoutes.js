
//managedesksbackend//Routes//PurchaseVoucherRoutes.js

const express = require("express");
  const { createPurchaseVoucher, getAllPurchaseVouchers,getPurchaseVoucher, updateVoucher } = require("../Controllers/PurchaseVoucher/PurchaseVoucherController")
 

  const purchaseVoucherController = express.Router();

  // Routes remain the same
  purchaseVoucherController.post("/purchase-voucher", createPurchaseVoucher);
  purchaseVoucherController.get("/purchase-voucher", getAllPurchaseVouchers);
  purchaseVoucherController.get("/purchase-voucher/:id", getPurchaseVoucher);
  purchaseVoucherController.put("/purchase-voucher/:id", updateVoucher);


  module.exports = purchaseVoucherController;