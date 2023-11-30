require("dotenv").config();
const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
const mongoString = process.env.DATABASE_URL;
const port = process.env.PORT;

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

// const enquiry = require("./Routes/enquiry");
// const users = require("./Routes/users");
// const branch = require("./Routes/branch");

// app.use(enquiry);
// app.use(users);
// app.use(branch);

app.get("/", (req, res) => {
  res.send(`<h1>Working</h1> ${port}`);
});

app.listen(port, () => {
  console.log(`Server Started at ${port}`);
});
