const express = require("express");
const users = express.Router();
const {
  create_account,
  create_user,
  update_user,
  get_user,
  verify_user,
} = require("../Controllers/users");

users.post("/create-account", create_account);
users.post("/create-user", create_user);
users.post("/update-user", update_user);
users.get("/user-get/:id", get_user);
users.post("/verify-user", verify_user);

module.exports = users;
