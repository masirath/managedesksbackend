// Routes/quotes.js
const express = require("express");

const {
    create_delivery_note,
    delete_delivery_note,
    get_delivery_note,
    get_all_delivery_notes,
} = require("../Controllers/delivery_notes");

const delivery_notes = express.Router();

delivery_notes?.post("/api/create-delivery-note", create_delivery_note);

delivery_notes?.post("/api/get-delivery-note", get_delivery_note);

delivery_notes?.post("/api/get-all-delivery-notes", get_all_delivery_notes);

delivery_notes?.post("/api/delete-delivery-note", delete_delivery_note);



module.exports = delivery_notes