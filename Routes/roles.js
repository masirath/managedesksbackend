const express = require("express");
const {
  create_role,
  update_role,
  delete_role,
  get_role,
  get_all_roles,
  get_role_log,
  get_all_role_logs,
} = require("../Controllers/roles");
const roles = express.Router();

roles.post("/api/create-role", create_role);
roles.post("/api/update-role", update_role);
roles.post("/api/delete-role", delete_role);
roles.post("/api/get-role", get_role);
roles.post("/api/get-all-roles", get_all_roles);
roles.post("/api/get-role-log", get_role_log);
roles.post("/api/get-all-role-logs", get_all_role_logs);

module.exports = roles;
