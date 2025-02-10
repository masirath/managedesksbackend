require("dotenv").config();
const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
const users = require("./Routes/users");
const product_units = require("./Routes/product_units");
const product_brands = require("./Routes/product_brands");
const product_categories = require("./Routes/product_categories");
const products = require("./Routes/products");
const customers = require("./Routes/customers");
const suppliers = require("./Routes/suppliers");
const expenses = require("./Routes/expenses");
const expense_categories = require("./Routes/expense_categories");
const inventories = require("./Routes/invetories");
const purchase_orders = require("./Routes/purchase_orders");
const invoices = require("./Routes/invoices");
const { environment } = require("./Global/environment");
const branches = require("./Routes/branches");
const dashboard = require("./Routes/dashboard");
const sales_returns = require("./Routes/sales_returns");
const purchases_returns = require("./Routes/purchases_returns");
const roles = require("./Routes/roles");
const requests = require("./Routes/requests");
const transfers = require("./Routes/transfers");
const received = require("./Routes/received");

//

const Environment = environment();

const PORT =
  Environment === "PRODUCTION"
    ? process.env.PRODUCTION_PORT
    : Environment === "TESTING"
    ? process.env.TESTING_PORT
    : Environment === "DEVELOPMENT"
    ? process.env.DEVELOPMENT_PORT
    : Environment === "LOCAL"
    ? process.env.LOCAL_PORT
    : "";

const DATABASE =
  Environment === "PRODUCTION"
    ? process.env.PRODUCTION_DATABASE
    : Environment === "TESTING"
    ? process.env.TESTING_DATABASE
    : Environment === "DEVELOPMENT"
    ? process.env.DEVELOPMENT_DATABASE
    : Environment === "LOCAL"
    ? process.env.LOCAL_DATABASE
    : "";

mongoose.connect(DATABASE);
const database = mongoose.connection;
database.on("error", (error) => {
  console.log(error);
});
database.once("connected", () => {
  console.log("Database Connected");
});

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use(users);
app.use(product_units);
app.use(product_brands);
app.use(product_categories);
app.use(products);
app.use(customers);
app.use(suppliers);
app.use(expenses);
app.use(expense_categories);
app.use(inventories);
app.use(purchase_orders);
app.use(purchases_returns);
app.use(invoices);
app.use(sales_returns);
app.use(branches);
app.use(dashboard);
app.use(roles);
app.use(requests);
app.use(transfers);
app.use(received);

app.listen(PORT, () => {
  console.log(`Server started at ${PORT}`);
});
