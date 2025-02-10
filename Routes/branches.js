const express = require("express");
const {
  create_branch,
  update_branch,
  get_branch,
  get_all_branches,
  get_branch_log,
  get_all_branches_log,
  delete_branch,
  get_general_branch,
} = require("../Controllers/branches");
const branches = express.Router();

branches.post("/api/create-branch", create_branch);
branches.post("/api/update-branch", update_branch);
branches.post("/api/delete-branch", delete_branch);
branches.post("/api/get-branch", get_branch);
branches.post("/api/get-all-branches", get_all_branches);
branches.post("/api/get-branch-log", get_branch_log);
branches.post("/api/get-all-branches-log", get_all_branches_log);

module.exports = branches;
