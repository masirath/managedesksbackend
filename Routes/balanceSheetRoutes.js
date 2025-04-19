//managedesk/Routes/balanceSheet.js
const express = require("express");
const {getBalanceSheetData
} = require("../Controllers/balanceSheetController");

const balanceSheetController = express.Router();

// Route to fetch a balance sheet by ID (GET)
balanceSheetController.get("/balance-sheet",getBalanceSheetData);

module.exports = balanceSheetController;
