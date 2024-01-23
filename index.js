require("dotenv").config();
const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");

// const Environment = "PRODUCTION";
const Environment = "DEVELOPMENT";

const port =
  Environment === "PRODUCTION"
    ? process.env.PRODUCTION_PORT
    : Environment === "DEVELOPMENT"
    ? process.env.DEVELOPMENT_PORT
    : "";

const mongodb = process.env.DEVELOPMENT_DATABASE;
Environment === "PRODUCTION"
  ? process.env.PRODUCTION_DATABASE
  : Environment === "DEVELOPMENT"
  ? process.env.DEVELOPMENT_DATABASE
  : "";

mongoose.connect(mongodb);
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

const users = require("./Routes/users");
const branch = require("./Routes/branch");
const customers = require("./Routes/customers");
const items = require("./Routes/items");
const quotations = require("./Routes/quotations");
const invoice = require("./Routes/invoice");
const deliveries = require("./Routes/deliveries");
const website = require("./Routes/website");

app.use(users);
app.use(branch);
app.use(customers);
app.use(items);
app.use(quotations);
app.use(invoice);
app.use(deliveries);
app.use(website);

app.listen(port, () => {
  console.log(`Server Started at ${port}`);
});
