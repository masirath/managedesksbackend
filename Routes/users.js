const express = require("express");
const {
  create_account,
  create_user,
  update_user,
  get_user,
  get_all_user,
  verify_user,
  get_user_ip,
} = require("../Controllers/users");
const users = express.Router();

users.post("/api/create-account", create_account);
users.post("/api/create-user", create_user);
users.post("/api/update-user", update_user);
users.get("/api/get-user/:id", get_user);
users.get("/api/get-all-users", get_all_user);
users.post("/api/verify-user", verify_user);
users.post("/api/get_user_ip", get_user_ip);

module.exports = users;
