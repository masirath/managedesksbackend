const express = require("express");
const {
  create_account,
  create_user,
  update_user,
  get_user,
  get_all_user,
  verify_user,
} = require("../Controllers/users");
const users = express.Router();

users.post("/create-account", create_account);
users.post("/create-user", create_user);
users.post("/update-user", update_user);
users.get("/get-user/:id", get_user);
users.get("/get-all-users", get_all_user);
users.post("/verify-user", verify_user);

module.exports = users;
