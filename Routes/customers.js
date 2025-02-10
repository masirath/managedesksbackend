const express = require("express");
const {
  create_customer,
  update_customer,
  get_customer,
  get_all_customers,
  get_customer_log,
  get_all_customers_log,
  delete_customer,
} = require("../Controllers/customers");
const customers = express.Router();

customers?.post("/api/create-customer", create_customer);
customers?.post("/api/update-customer", update_customer);
customers?.post("/api/delete-customer", delete_customer);
customers?.post("/api/get-customer", get_customer);
customers?.post("/api/get-all-customers", get_all_customers);
customers?.post("/api/get-all-customers", get_customer_log);
customers?.post("/api/get-all-customers-log", get_all_customers_log);

module.exports = customers;
