const express = require("express");
const {
  create_branch,
  update_branch,
  get_branch,
  get_all_branches,
  get_branch_log,
  get_all_branches_log,
  delete_branch,
  get_all_sub_branches,
  get_auth_branch,
} = require("../Controllers/branches");
const branches = express.Router();

branches.post("/api/create-branch", create_branch);
branches.post("/api/update-branch", update_branch);
branches.post("/api/delete-branch", delete_branch);
branches.post("/api/get-branch", get_branch);
branches.post("/api/get-auth-branch", get_auth_branch);
branches.post("/api/get-all-branches", get_all_branches);
branches.post("/api/get-all-sub-branches", get_all_sub_branches);
branches.post("/api/get-branch-log", get_branch_log);
branches.post("/api/get-all-branches-log", get_all_branches_log);

module.exports = branches;
