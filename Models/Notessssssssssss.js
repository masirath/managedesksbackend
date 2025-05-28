/**
 * 
 * Notes taking for Model 
 * 
 * Task 1 - you have to update the models of quotes so that the delivery note and quotes will be link as per reference
 * 
 * 
 * 
 *
 * 
 * 
 *  // Models/quotes.js
const mongoose = require("mongoose");

const quotes_schema = mongoose.Schema({
  // Existing fields...
  delivery_status: {
    type: Number,
    default: 0, // 0: Not Delivered, 1: Partially Delivered, 2: Fully Delivered
  },
  delivery_notes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "delivery_notes",
    },
  ],
});

module.exports = mongoose.model("quotes", quotes_schema, "quotes");




 * Task 2-
 */