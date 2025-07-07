const express = require("express");
const {
  create_lpo,
  get_lpo,
  get_all_lpos,
  get_all_lpos_details,
  update_lpo,
  delete_lpo,
  get_all_lpo_details,
} = require("../Controllers/lpos");
const lpos = express.Router();

lpos?.post("/api/create-lpo", create_lpo);
lpos?.post("/api/update-lpo", update_lpo);
lpos?.post("/api/delete-lpo", delete_lpo);
lpos?.post("/api/get-lpo", get_lpo);
lpos?.post("/api/get-all-lpos", get_all_lpos);
lpos?.post("/api/get-all-lpos-details", get_all_lpos_details);
lpos?.post("/api/get-all-lpo-details", get_all_lpo_details);

module.exports = lpos;
