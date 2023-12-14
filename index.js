require("dotenv").config();
const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
const mongodb = process.env.DATABASE;
const port = process.env.PORT;

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

app.use(users);
app.use(branch);
app.use(customers);
app.use(items);
app.use(quotations);
app.use(invoice);

app.get("/", (req, res) => {
  res.send(`Working ${port} == 4000 Port`);
});

app.listen(port, () => {
  console.log(`Server Started at ${port}`);
});
