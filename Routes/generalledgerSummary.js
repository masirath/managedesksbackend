const express = require("express");
const { getSummary, getDrilldownTransactions } = require("../Controllers/GeneralLedgerSummary");

const generalLedgerSummary = express.Router();

/**
 * ✅ Route to fetch general ledger summary (per account)
 * GET /api/ledger-summary/summary?start_date=2025-03-01&end_date=2025-03-25
 */
generalLedgerSummary.get("/summary", getSummary);

/**
 * ✅ Route to fetch drilldown transactions for a specific account
 * GET /api/ledger-summary/drilldown?account_code=100&start_date=2025-03-01&end_date=2025-03-25
 */
generalLedgerSummary.get("/drilldown", getDrilldownTransactions);

module.exports = generalLedgerSummary;
