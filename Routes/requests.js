const express = require("express");
const {
  create_request,
  get_request,
  get_all_requests,
  update_request,
  delete_request,
  get_request_inventories,
  get_all_requested,
} = require("../Controllers/requests");
const requests = express.Router();

requests?.post("/api/create-request", create_request);
requests?.post("/api/update-request", update_request);
requests?.post("/api/delete-request", delete_request);
requests?.post("/api/get-request", get_request);
requests?.post("/api/get-request-inventories", get_request_inventories);
requests?.post("/api/get-all-requests", get_all_requests);
requests?.post("/api/get-all-requested", get_all_requested);

module.exports = requests;
