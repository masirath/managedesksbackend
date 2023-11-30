const express = require("express");
const users = express.Router();
const {
  create_account,
  create_user,
  user_status,
  update_user,
  verify_user,
} = require("../Controllers/users");

users.post("/create-account", create_account);
users.post("/create-user", create_user);
users.post("/update-user", update_user);
users.post("/user-status", user_status);
users.post("/verify-user", verify_user);

module.exports = users;
