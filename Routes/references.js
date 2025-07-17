const express = require("express");
const {
  create_reference,
  update_reference,
  get_reference,
  get_all_references,
  delete_reference,
} = require("../Controllers/references");
const references = express.Router();

references?.post("/api/create-reference", create_reference);
references?.post("/api/update-reference", update_reference);
references?.post("/api/delete-reference", delete_reference);
references?.post("/api/get-reference", get_reference);
references?.post("/api/get-all-references", get_all_references);

module.exports = references;
