
// const mongoose = require("mongoose");
// const GRN = require("../Models/Grn");
// const Product = require("../Models/products");
// const Inventory = require("../Models/inventories");
// const PurchaseOrder = require("../Models/purchase_orders");
// const PurchaseOrderDetail = require("../Models/purchase_orders_details");
// const User = require("../Models/User")
// const {
//   success_200,
//   failed_400,
//   incomplete_400,
//   unauthorized
// } = require("../Global/errors");

// const { authorization } = require("../Global/authorization");

// /**
//  * Create GRN 
//  */
// const create_grn = async (req, res) => {
//   try {
//     const auth = authorization(req, res, () => {});
//     if (!auth || !auth.id || !auth.branch) {
//       console.log("🚫 Unauthorized access");
//       return unauthorized(res);
//     }

//     const body = req.body;

//     const { grn_number, grn_date, received_by, notes, purchase_order } = body;

//     // Validate only essential fields
//     if (!grn_number || !grn_date || !received_by) {
//       return incomplete_400(res, "GRN number, date, and received by are required");
//     }

//     const grn_details = body.grn_details || [];

//     if (!Array.isArray(grn_details) || grn_details.length === 0) {
//       return incomplete_400(res, "At least one item must be included in GRN details");
//     }

//     let poDetails = [];
//     let poProducts = [];

//     if (purchase_order) {
//       const po = await PurchaseOrder.findById(purchase_order).exec();
//       if (!po) {
//         return failed_400(res, "Purchase order not found");
//       }

//       poDetails = await PurchaseOrderDetail.find({ purchase: purchase_order }).exec();

//       if (!poDetails.length) {
//         return failed_400(res, "No items found in this purchase order");
//       }

//       poProducts = poDetails.map(d => d.product_name);
//     }

//     const processedDetails = [];

//     for (let i = 0; i < grn_details.length; i++) {
//       const item = grn_details[i];

//       // Get product name if available, otherwise use empty string
//       const product_name = item.product_name?.trim() || item.name?.trim() || "";

//       let product_id = null;

//       // If product_id is passed, validate it
//       if (item.product_id && mongoose.Types.ObjectId.isValid(item.product_id)) {
//         const product = await Product.findById(item.product_id).exec();
//         if (product) {
//           product_id = product._id;
//         }
//       }

//       // If linked to PO, check if product is valid
//       if (purchase_order && poProducts.length && product_name) {
//         const matchedPOItem = poDetails.find(poItem => poItem.product_name === product_name);

//         if (!matchedPOItem) {
//           return failed_400(res, `Product "${product_name}" is not part of this PO`);
//         }

//         // Optional: Enforce quantity <= PO
//         if (item.received_quantity > matchedPOItem.quantity) {
//           return failed_400(
//             res,
//             `Quantity for "${product_name}" exceeds purchase order`
//           );
//         }
//       }

//       processedDetails.push({
//         product_id,
//         product_name,
//         received_quantity: parseFloat(item.received_quantity) || 0,
//         damaged_quantity: parseFloat(item.damaged_quantity) || 0,
//         unit_price: parseFloat(item.unit_price) || 0,
//         total_value: (parseFloat(item.received_quantity) || 0) * (parseFloat(item.unit_price) || 0),
//         barcode: item.barcode || "",
//         remarks: item.remarks || ""
//       });
//     }

//     const total_received = processedDetails.reduce((sum, d) => sum + (d.total_value || 0), 0);

//     // Build GRN model
//     const grn = new GRN({
//       grn_number,
//       grn_date: new Date(grn_date),
//       received_by,
//       notes: notes || "",
//       branch: auth.branch,
//       created_by: auth.id,
//       status: "Received",
//       total_received,
//       grn_details: processedDetails,
//       purchase_order: purchase_order || null
//     });

//     const savedGrn = await grn.save();

//     // Update inventory only for items with names
//     const inventoryUpdates = processedDetails
//       .filter(detail => detail.product_name)
//       .map(detail => ({
//         updateOne: {
//           filter: { product_name: detail.product_name },
//           update: { 
//             $inc: { quantity: detail.received_quantity }, 
//             $setOnInsert: { product_name: detail.product_name } 
//           },
//           upsert: true
//         }
//       }));

//     if (inventoryUpdates.length > 0) {
//       await Inventory.bulkWrite(inventoryUpdates);
//     }

//     // Mark PO as completed
//     if (purchase_order) {
//       await PurchaseOrder.findByIdAndUpdate(purchase_order, {
//         $set: { status: "completed" }
//       }).exec();
//     }

//     return success_200(res, {
//       success: true,
//       message: "GRN created successfully",
//       data: {
//         id: savedGrn._id,
//         grn_number: savedGrn.grn_number,
//         status: savedGrn.status,
//         total_received: savedGrn.total_received,
//         items: savedGrn.grn_details.length
//       }
//     });
//   } catch (error) {
//     console.error("💥 [ERROR] Failed to create GRN:", error.message);
//     return failed_400(res, error.message || "Failed to create GRN");
//   }
// };

// /**
//  * Fetch all GRNs
//  */
// const getGRNs = async (req, res) => {
//   try {
//     const auth = authorization(req);
//     if (!auth) return unauthorized(res);

//     const { page = 1, limit = 10 } = req.query;

//     const grns = await GRN.find({ branch: auth.branch })
//       .populate("created_by", "name")
//       .limit(parseInt(limit))
//       .skip((parseInt(page) - 1) * parseInt(limit))
//       .sort({ createdAt: -1 });

//     const count = await GRN.countDocuments({ branch: auth.branch });

//     return success_200(res, {
//       success: true,
//       data: grns,
//       total: count,
//       page: parseInt(page),
//       limit: parseInt(limit)
//     });
//   } catch (err) {
//     console.error("Error fetching GRNs:", err);
//     return failed_400(res, err.message || "Failed to fetch GRNs");
//   }
// };

// /**
//  * Fetch a specific GRN by ID
//  */
// const getGRNById = async (req, res) => {
//   try {
//     const auth = authorization(req);
//     if (!auth) return unauthorized(res);

//     const grnId = req.params.id;

//     const grn = await GRN.findOne({ _id: grnId, branch: auth.branch })
//       .populate("created_by", "name email")
//       .lean()
//       .exec();

//     if (!grn) return failed_400(res, "GRN not found");

//     return success_200(res, {
//       success: true,
//       data: grn
//     });
//   } catch (err) {
//     return failed_400(res, err.message || "Failed to fetch GRN");
//   }
// };

// module.exports = {
//   create_grn,
//   getGRNs,
//   getGRNById
// };




/**
 * Refactor version of api
 */


const mongoose = require("mongoose");
const GRN = require("../Models/Grn");
const Product = require("../Models/products");
// const Supplier = require("../Models/suppliers")
const Supplier = require("../Models/suppliers")
const Inventory = require("../Models/inventories");
const PurchaseOrder = require("../Models/purchase_orders");
const PurchaseOrderDetail = require("../Models/purchase_orders_details");
const User = require("../Models/User");
const {
  success_200,
  failed_400,
  incomplete_400,
  unauthorized
} = require("../Global/errors");
const { authorization } = require("../Global/authorization");

const create_grn = async (req, res) => {
  try {
    const auth = authorization(req, res, () => { });
    if (!auth || !auth.id || !auth.branch) {
      console.log("🚫 Unauthorized access");
      return unauthorized(res);
    }

    const body = req.body;
    const { grn_number, grn_date, received_by, notes, purchase_order_id, supplier } = body;

    // Validate required fields
    if (!grn_number || !grn_date || !received_by) {
      return incomplete_400(res, "GRN number, date, and received by are required");
    }

    // Validate supplier or purchase order
    if (!supplier && !purchase_order_id) {
      return incomplete_400(res, "Supplier is required when no purchase order is selected");
    }

    // Validate purchase order (if provided)
    let poDetails = [], poProducts = [], purchase_order_number = null;
    if (purchase_order_id) {
      const po = await PurchaseOrder.findById(purchase_order_id).exec();
      if (!po) return failed_400(res, "Purchase order not found");

      purchase_order_number = po.number; // Extract PO number
      poDetails = await PurchaseOrderDetail.find({ purchase: purchase_order_id }).exec();
      if (!poDetails.length) return failed_400(res, "No items found in this purchase order");

      poProducts = poDetails.map(d => d.product_name);

      // Validate supplier against PO supplier
      if (supplier && po.supplier.toString() !== supplier) {
        return failed_400(res, "Supplier does not match the purchase order supplier");
      }
    }

    // Validate supplier
    let supplierDoc;
    if (supplier) {
      if (!mongoose.Types.ObjectId.isValid(supplier)) {
        return failed_400(res, "Invalid supplier ID format");
      }
      supplierDoc = await Supplier.findById(supplier).exec();
      if (!supplierDoc) return failed_400(res, "Invalid or non-existent supplier");
    }

    // Process GRN details
    const grn_details = body.grn_details || [];
    if (!Array.isArray(grn_details) || grn_details.length === 0) {
      return incomplete_400(res, "At least one item must be included in GRN details");
    }

   // Validate each item before processing
   const extractProductName = (item) => {
    if (!item) return "";
    if (typeof item.product_name === "string") return item.product_name.trim();
    if (typeof item.name === "string") return item.name.trim();
    return "";
  };
  
        for (const [index, item] of grn_details.entries()) {
          const productName = extractProductName(item);

          if (!productName) {
            return failed_400(res, `Product name is missing or invalid at row ${index + 1}`);
          }
        }

        
    const processedDetails = [];
    for (const item of grn_details) {
      const product_name = extractProductName(item);
    
      let product_id = null;

      // Validate product ID (if provided)
      if (item.product_id && mongoose.Types.ObjectId.isValid(item.product_id)) {
        const product = await Product.findById(item.product_id).exec();
        if (product) product_id = product._id;
      }

      // Validate against PO (if applicable)
      if (purchase_order_id && poProducts.length && product_name) {
        const matchedPOItem = poDetails.find((poItem) => {
          const poName = extractProductName(poItem);
          return poName.toLowerCase() === product_name.toLowerCase();
        });
        
        if (!matchedPOItem) {
          return failed_400(res, `Product "${product_name}" is not part of this PO`);
        }
        if (item.received_quantity > matchedPOItem.quantity) {
          return failed_400(res, `Quantity for "${product_name}" exceeds purchase order`);
        }
      }
      processedDetails.push({
        product_id,
        product_name,
        received_quantity: parseFloat(item.received_quantity) || 0,
        damaged_quantity: parseFloat(item.damaged_quantity) || 0,
        unit_price: parseFloat(item.unit_price) || 0,
        total_value: (parseFloat(item.received_quantity) || 0) * (parseFloat(item.unit_price) || 0),
        barcode: item.barcode || "",
        remarks: item.remarks || ""
      });
    }

    // Calculate total received value
    const total_received = processedDetails.reduce((sum, d) => sum + (d.total_value || 0), 0);

    // Create GRN document
    const grn = new GRN({
      grn_number,
      grn_date: new Date(grn_date),
      received_by,
      notes: notes || "",
      branch: auth.branch,
      created_by: auth.id,
      status: "Received",
      total_received,
      grn_details: processedDetails,
      purchase_order: purchase_order_id || null,
      purchase_order_number: purchase_order_number || null,
      supplier: supplierDoc?._id || supplier
    });

    const savedGrn = await grn.save();

    // Update inventory
    const inventoryUpdates = processedDetails
      .filter(detail => detail.product_name)
      .map(detail => ({
        updateOne: {
          filter: { product_name: detail.product_name },
          update: {
            $inc: { quantity: detail.received_quantity },
            $setOnInsert: {
              product_name: detail.product_name,
              unit_price: detail.unit_price,
              barcode: detail.barcode || "",
              created_at: new Date(),
              updated_at: new Date()
            }
          },
          upsert: true
        }
      }));

    if (inventoryUpdates.length > 0) {
      await Inventory.bulkWrite(inventoryUpdates);
    }

    // Update purchase order status (if applicable)
    if (purchase_order_id) {
      const poItems = await PurchaseOrderDetail.find({ purchase: purchase_order_id }).exec();
      const poItemMap = new Map(poItems.map(item => [item.product_name, item.quantity]));

      const allItemsReceived = Array.from(poItemMap.keys()).every(product_name => {
        const totalReceived = grn_details
          .filter(item => item.product_name === product_name)
          .reduce((sum, item) => sum + (item.received_quantity || 0), 0);
        return totalReceived >= poItemMap.get(product_name);
      });

      if (allItemsReceived) {
        await PurchaseOrder.findByIdAndUpdate(purchase_order_id, {
          $set: { status: "completed" }
        }).exec();
      }
    }

    return success_200(res, {
      success: true,
      message: "GRN created successfully",
      data: {
        id: savedGrn._id,
        grn_number: savedGrn.grn_number,
        status: savedGrn.status,
        total_received: savedGrn.total_received,
        items: savedGrn.grn_details.length
      }
    });
  } catch (error) {
    console.error("💥 [ERROR] Failed to create GRN:", error.message, error.stack);
    return failed_400(res, `Failed to create GRN: ${error.message}`);
  }
};

/**
 * Fetch all GRNs
 */
const getGRNs = async (req, res) => {
  try {
    const auth = authorization(req);
    if (!auth) return unauthorized(res);

    const { page = 1, limit = 10 } = req.query;
    const grns = await GRN.find({ branch: auth.branch })
      .populate("created_by", "name")
      .populate("supplier", "name") // 👈 add this line
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

    const count = await GRN.countDocuments({ branch: auth.branch });

    return success_200(res, {
      success: true,
      data: grns,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error("Error fetching GRNs:", err);
    return failed_400(res, err.message || "Failed to fetch GRNs");
  }
};

/**
 * Fetch a specific GRN by ID
 */
const getGRNById = async (req, res) => {
  try {
    const auth = authorization(req);
    if (!auth) return unauthorized(res);

    const grnId = req.params.id;
    const grn = await GRN.findOne({ _id: grnId, branch: auth.branch })
      .populate("created_by", "name email")
      .lean()
      .exec();

    if (!grn) return failed_400(res, "GRN not found");

    return success_200(res, {
      success: true,
      data: grn
    });
  } catch (err) {
    return failed_400(res, err.message || "Failed to fetch GRN");
  }
};

module.exports = {
  create_grn,
  getGRNs,
  getGRNById
};

