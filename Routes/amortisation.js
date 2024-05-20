const express = require("express");
const {
  create_amortisation,
  update_amortisation,
  get_amortisation,
  get_all_amortisation,
} = require("../Controllers/amortisation");
const amortisation = express.Router();

amortisation.post("/api/create-amortisation", create_amortisation);
amortisation.post("/api/update-amortisation", update_amortisation);
amortisation.get("/api/get-amortisation/:id", get_amortisation);
amortisation.get("/api/get-all-amortisation", get_all_amortisation);

module.exports = amortisation;
