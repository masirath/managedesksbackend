const express = require("express");
const {
  get_create_role,
  create_role,
  update_role,
  get_role,
  get_all_roles,
} = require("../Controllers/roles");
const roles = express.Router();

roles.get("/api/get-create-role", get_create_role);
roles.post("/api/create-role", create_role);
roles.post("/api/update-role", update_role);
roles.get("/api/get-role/:id", get_role);
roles.get("/api/get-all-roles", get_all_roles);

module.exports = roles;
