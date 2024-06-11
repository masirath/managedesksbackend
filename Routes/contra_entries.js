const express = require("express");
const {
  create_contra_entries,
  update_contra_entries,
  get_contra_entries,
  get_all_contra_entries,
} = require("../Controllers/contra_entries");
const contra_entries = express.Router();

contra_entries.post("/api/create-contra-entries", create_contra_entries);
contra_entries.post("/api/update-contra-entries", update_contra_entries);
contra_entries.get("/api/get-contra-entries/:id", get_contra_entries);
contra_entries.get("/api/get-all-contra-entries", get_all_contra_entries);

module.exports = contra_entries;
