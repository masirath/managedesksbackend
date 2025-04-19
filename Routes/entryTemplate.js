
const express = require("express");

const {createEntryTemplate} = require("../Controllers/entryTemplate")


const entryTemplate = express.Router()

entryTemplate?.post("/api/create-entry-template",createEntryTemplate )

module.exports = entryTemplate