const express = require("express");
const {
  create_inventory,
  update_inventory,
  delete_inventory,
  get_inventory,
  get_all_inventories,
  get_inventory_log,
  get_all_inventories_log,
  get_inventory_barcode,
  download_inventory_csv,
  create_inventories_csv,
} = require("../Controllers/inventories");
const inventories = express.Router();
const multer = require("multer");
const path = require("path");

inventories.post("/api/create-inventory", create_inventory);
inventories.post("/api/update-inventory", update_inventory);
inventories.post("/api/delete-inventory", delete_inventory);
inventories.post("/api/get-inventory", get_inventory);
inventories.post("/api/get-all-inventories", get_all_inventories);
inventories.post("/api/get_inventory_log", get_inventory_log);
inventories.post("/api/get_all_inventories_log", get_all_inventories_log);
inventories.post("/api/get-inventory-barcode", get_inventory_barcode);
inventories.post("/api/download-inventory-csv", download_inventory_csv);

const storage = multer.diskStorage({
  destination: "uploads/inventories",
  filename: (_, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

inventories.post(
  "/api/create-inventories-csv",
  upload.single("file"),
  create_inventories_csv
);

module.exports = inventories;
