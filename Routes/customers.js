const express = require("express");
const {
  create_customer,
  update_customer,
  get_customer,
  get_all_customers,
} = require("../Controllers/customers");
const customers = express.Router();

customers.post("/create-customer", create_customer);
customers.post("/update-customer", update_customer);
customers.get("/get-customer/:id", get_customer);
customers.get("/get-all-customers", get_all_customers);

module.exports = customers;
