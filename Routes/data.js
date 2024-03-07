const express = require("express");
const { get_country_data, get_industry_data } = require("../Controllers/data");
const data = express.Router();

data.post("/api/get-country-data", get_country_data);
data.post("/api/get-industry-data", get_industry_data);

module.exports = data;
