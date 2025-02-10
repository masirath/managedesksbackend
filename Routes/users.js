const express = require("express");
const {
  signup,
  send_otp,
  signin,
  signout,
  create_user,
  update_user,
  get_user,
  get_all_users,
  get_user_log,
  get_all_users_logs,
  delete_user,
  get_user_auth,
  update_user_auth,
} = require("../Controllers/users");
const users = express.Router();

users.post("/api/signup", signup);
users.post("/api/send-otp", send_otp);
users.post("/api/signin", signin);
users.post("/api/signout", signout);
users.post("/api/create-user", create_user);
users.post("/api/update-user", update_user);
users.post("/api/update-user-auth", update_user_auth);
users.post("/api/delete-user", delete_user);
users.post("/api/get-user", get_user);
users.post("/api/get-user-auth", get_user_auth);
users.post("/api/get-all-users", get_all_users);
users.post("/api/get-user-log/:id", get_user_log);
users.post("/api/get-all-user-logs/:user", get_all_users_logs);

module.exports = users;
