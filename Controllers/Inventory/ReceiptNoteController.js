const ReceiptNote = require('../../Models/ReceiptNote');
const PurchaseOrder = require("../../Models/purchase_orders");
const PurchaseOrderDetail = require('../../Models/purchase_orders_details');
const { success_200, failed_400, catch_400 } = require("../../Global/responseHandlers");
const { authorization } = require("../../Global/authorization");

// Helper to validate required fields in the request
const validateRequiredFields = (body) => {
  const missingFields = [];
  const requiredFields = ['purchase_order', 'items', 'ref', 'branch'];

  requiredFields.forEach(field => {
    if (!body[field] || (Array.isArray(body[field]) && body[field].length === 0)) {
      missingFields.push(field);
    }
  });

  return missingFields;
};

// Helper to validate items in the purchase order details
const isValidItem = async (itemName) => {
  try {
    const item = await PurchaseOrderDetail.findOne({ name: itemName });
    return item ? true : false;
  } catch (err) {
    throw new Error('Error checking item: ' + err.message);
  }
};

// Function to create a receipt note
// Function to create a receipt note
const createReceiptNote = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) return failed_400(res, "Unauthorized access");

    console.log('Received Payload:', req.body); 
    const { 
      purchase_order, reference, note, supplier, delivery_note, 
      warehouse_location, invoice_number, received_by, date, items, 
      ref, branch, status 
    } = req.body;

    // Check for missing fields
    const missingFields = validateRequiredFields(req.body);
    if (missingFields.length > 0) {
      return failed_400(res, "Missing required fields", { missingFields });
    }

    // Ensure the branch is authorized
    if (branch !== authorize.branch) {
      return failed_400(res, "Unauthorized branch access");
    }

    // Validate Purchase Order
    const po = await PurchaseOrder.findById(purchase_order);
    if (!po) return failed_400(res, "Purchase order not found");

    // Validate reference
    if (ref !== authorize.ref) {
      return failed_400(res, "Unauthorized reference access");
    }

    // Validate each item and check received quantities
    const updatedItems = [];
    for (const item of items) {
      const { name, quantity, delivered } = item;

      const isItemValid = await isValidItem(name);
      if (!isItemValid) {
        return failed_400(res, `Item not found: ${name}`);
      }

      if (delivered > quantity) {
        return failed_400(res, `Delivered quantity cannot exceed ordered quantity for item: ${name}`);
      }

      updatedItems.push({ name, quantity, delivered });

      // Update the PurchaseOrderDetail (items) with delivered quantities
      const poDetail = await PurchaseOrderDetail.findOne({ purchase_order: po._id, item: name });
      if (!poDetail) return failed_400(res, `Purchase order detail not found for item: ${name}`);

      poDetail.delivered += delivered;
      await poDetail.save();
    }

    // Create the receipt note (GRN)
    const receiptNote = new ReceiptNote({
      purchase_order,
      reference,
      note,
      supplier,
      delivery_note,
      warehouse_location,
      invoice_number,
      received_by,
      date,
      items: updatedItems,
      status: status || 1, // Default to 1 if not provided
      ref,
      branch,
      created_by: authorize._id, // Created by the authenticated user
    });

    await receiptNote.save();

    // Update Purchase Order status if all items are delivered
    let allDelivered = true;
    po.purchase_order_details.forEach(async (poDetail) => {
      if (poDetail.quantity > poDetail.delivered) {
        allDelivered = false;
      }
    });

    if (allDelivered) {
      po.status = 'received'; // Or any other status that signifies the order is fully delivered
    }

    await po.save();

    return success_200(res, "Receipt Note created successfully", receiptNote);
  } catch (error) {
    console.error("Error creating receipt note:", error);
    return failed_400(res, "Failed to create receipt note", error);
  }
};

// Get all receipt notes for the authenticated user's branch
const getReceiptNotes = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) return failed_400(res, "Unauthorized access");

    const notes = await ReceiptNote.find({ branch: authorize.branch })
      .populate("purchase_order")
      .populate("items.item") // Ensure item details are populated correctly
      .sort({ created_at: -1 });

    return success_200(res, "Fetched receipt notes", notes);
  } catch (err) {
    return catch_400(res, err);
  }
};

// Get a single receipt note by ID
const getReceiptNoteById = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) return failed_400(res, "Unauthorized access");

    const note = await ReceiptNote.findOne({
      _id: req.params.id,
      branch: authorize.branch, // Ensure the branch matches
    })
      .populate("purchase_order")
      .populate("items.item");

    if (!note) return failed_400(res, "Receipt Note not found");

    return success_200(res, "Fetched receipt note", note);
  } catch (err) {
    return catch_400(res, err);
  }
};

module.exports = {
  createReceiptNote,
  getReceiptNotes,
  getReceiptNoteById,
};
