const express = require("express");
const enquiry = express.Router();
const { create_enquiry, get_enquiry } = require("../Controllers/enquiry");

enquiry.post("/create-enquiry", create_enquiry);
enquiry.get("/enquiry", get_enquiry);

module.exports = enquiry;
