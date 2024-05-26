const express = require("express");
const {
  create_asset,
  update_asset,
  get_all_assets,
  get_asset,
} = require("../Controllers/assets");
const assets = express.Router();

assets.post("/api/create-asset", create_asset);
assets.post("/api/update-asset", update_asset);
assets.get("/api/get-asset/:id", get_asset);
assets.get("/api/get-all-assets", get_all_assets);

module.exports = assets;
