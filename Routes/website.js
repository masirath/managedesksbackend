const express = require("express");
const { create_website_quote } = require("../Controllers/website");
const website = express.Router();

website.post("/api/create-website-quote", create_website_quote);

module.exports = website;
