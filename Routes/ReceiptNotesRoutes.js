// managedesksbackend/Routes/ReceiptNoteRoutes.js
const express = require("express");
const ReceiptNoteController = express.Router();
const { createReceiptNote, getReceiptNotes } = require("../../managedesksbackend/Controllers/Inventory/ReceiptNoteController");

// POST route for creating a receipt note
ReceiptNoteController.post("/create-receipt", createReceiptNote);

// GET route for fetching all receipt notes
ReceiptNoteController.get("/received-receipt", getReceiptNotes);

module.exports = ReceiptNoteController;
