const express = require("express");
const users = express.Router();
const {
  get_otp,
  verify_otp,
  create_user,
  verify_user,
  create_people,
} = require("../Controllers/users");

users.get("/get-otp", get_otp);
users.post("/verify-otp", verify_otp);
users.post("/create-user", create_user);
users.post("/verify-user", verify_user);
users.post("/create-people", create_people);

module.exports = users;
