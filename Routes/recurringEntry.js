// routes/recurringEntryRoutes.js
const express = require("express");

const {createRecurringEntry} = require("../Controllers/recurringEntry")

// Add other routes (get, update, delete) as needed

const recurringEntry = express.Router()

recurringEntry?.post("/api/create-recurring-entry", createRecurringEntry)

module.exports = recurringEntry;