const express = require("express");
const branch = express.Router();
const { create_branch } = require("../Controllers/branch");

branch.post("/create-branch", create_branch);

module.exports = branch;
