const express = require("express");
const GrnRoutes = express.Router();
const {
  create_grn,
  getGRNs,
  getGRNById,
} = require("../Controllers/GrnController");

// POST /api/grn/create
// GrnRoutes.post("/create", authorization, create_grn);
GrnRoutes.post("/create", (req, res, next) => {
  console.log("🚨 Incoming GRN create request");
  console.log("Headers:", req.headers);
  console.log("Auth Data:", req.user || req.auth); // depending on middleware
  return create_grn(req, res, next);
});
// GET /api/grn/
GrnRoutes.get("/", getGRNs);

// GET /api/grn/:id
GrnRoutes.get("/:id", getGRNById);

module.exports = GrnRoutes;