const express = require("express");


//const {getTrialBalanceReport} = require("../services/trialBalanceController")
const { getTrialBalanceReport } = require("../services/trialBalanceController");

const trialbalanceController = express.Router()
//Routes to fetch a TRIAL BALANCEs report by
trialbalanceController.get("/trial-balance", getTrialBalanceReport)

module.exports = trialbalanceController