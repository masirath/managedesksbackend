require("dotenv").config();
const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
const mongoString = process.env.DATABASE_URL;

mongoose.connect(mongoString);
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

app.use(users);
app.use(branch);

app.listen(8000, () => {
  console.log(`Server Started at ${8000}`);
});
