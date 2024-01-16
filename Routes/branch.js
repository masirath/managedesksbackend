const express = require("express");
const { create_branch } = require("../Controllers/branch");
const branch = express.Router();

branch.post("/api/create-branch", create_branch);

module.exports = branch;
