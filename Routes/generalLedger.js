const express = require("express");
const { getBalances, getAllTransactions } = require("../Controllers/generalLedger");

const generalLedger = express.Router();

/**
 * ✅ Route to fetch all account balances
 * GET /api/ledger/balances
 */
generalLedger.get("/balances", getBalances);

/**
 * ✅ Route to fetch general ledger transactions (with filters, pagination & sorting)
 * GET /api/ledger/transactions?page=1&limit=10&account_code=100&start_date=2025-03-01&end_date=2025-03-25&sort=oldest
 */
generalLedger.get("/transactions", getAllTransactions);

module.exports = generalLedger;
