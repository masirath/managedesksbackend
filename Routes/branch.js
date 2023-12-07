const express = require("express");
const { create_branch } = require("../Controllers/branch");
const branch = express.Router();

branch.post("/create-branch", create_branch);

module.exports = branch;
