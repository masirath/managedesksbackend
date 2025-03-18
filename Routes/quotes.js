const express = require("express");
const {
  create_quote,
  get_quote,
  get_all_quotes,
  update_quote,
  delete_quote,
  get_all_quote_details,
} = require("../Controllers/quotes");
const quotes = express.Router();

quotes?.post("/api/create-quote", create_quote);
quotes?.post("/api/update-quote", update_quote);
quotes?.post("/api/delete-quote", delete_quote);
quotes?.post("/api/get-quote", get_quote);
quotes?.post("/api/get-all-quotes", get_all_quotes);
quotes?.post("/api/get-all-quote-details", get_all_quote_details);

module.exports = quotes;
