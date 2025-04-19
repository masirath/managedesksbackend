//managedesk/Routes/ProfitLossRoutes.js

const express = require("express");

const {getProfitLossReport } = require("../services/profitLossController")

const profitLossController = express.Router()

//Routes to fetch a P & Loss report by

profitLossController.get("/profit-loss", getProfitLossReport)

module.exports = profitLossController