
////test
const PurchaseVoucher = require("../../Models/PurchaseVoucher");
const Supplier = require("../../Models/suppliers");
const Product = require("../../Models/products");
//const Branch = require("../../Models/branches");
const {
    success_200,
    failed_400,
    incomplete_400,
    unauthorized,
    catch_400,
  } = require("../../Global/responseHandlers");
  const { authorization } = require("../../Global/authorization");

const PurchaseVoucherService = require("../../services/purchaseVoucherService");

const createPurchaseVoucher = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) return unauthorized(res);

    const {
      voucherNumber,
      supplier,
      date,
      dueDate,
      reference,
      items,
      branch: bodyBranch,
      ref,
    } = req.body;

    // Validate required fields
    const requiredFields = ['voucherNumber', 'supplier', 'date', 'items'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return incomplete_400(res, `Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate branch ownership
    const branch = bodyBranch || authorize.branch;
    if (bodyBranch && !authorize.allBranches.includes(bodyBranch)) {
      return unauthorized(res, "Unauthorized branch access");
    }

    // Check voucher number uniqueness
    const existingVoucher = await PurchaseVoucher.findOne({ 
      voucherNumber, 
      branch 
    });
    if (existingVoucher) {
      return failed_400(res, "Voucher number already exists in this branch");
    }

    // Validate supplier exists in same branch
    const supplierExists = await Supplier.findOne({
      _id: supplier,
      branch
    });
    if (!supplierExists) {
      return failed_400(res, "Supplier not found in this branch");
    }

    // Validate items structure
    if (!Array.isArray(items) || items.length === 0) {
      return failed_400(res, "Valid items array required");
    }

    // Validate each item
    for (const [index, item] of items.entries()) {
      if (!item.product || !item.quantity || !item.rate) {
        return failed_400(res, `Item ${index + 1} missing required fields`);
      }
      
      // Validate product exists in branch
      const productExists = await Product.findOne({
        _id: item.product,
        branch
      });
      if (!productExists) {
        return failed_400(res, `Product ${item.product} not found in branch`);
      }
    }

    // Calculate financials
    const { subTotal, vatTotal, totalAmount, vatSummary } =
      PurchaseVoucherService.calculateVoucher(items);

    const newVoucher = new PurchaseVoucher({
      voucherNumber,
      supplier,
      date: new Date(date),
      dueDate: dueDate ? new Date(dueDate) : null,
      reference,
      items: items.map(item => ({
        ...item,
        product: item.product,
        quantity: Number(item.quantity),
        rate: Number(item.rate)
      })),
      subTotal,
      vatTotal,
      totalAmount,
      vatSummary,
      billAdjustments: PurchaseVoucherService.extractBillAdjustments(items),
      status: 1,
      ref,
      branch,
      created: new Date(),
      created_by: authorize.id
    });

    await newVoucher.save();
    return success_200(res, "Purchase Voucher created", newVoucher);
  } catch (err) {
    return catch_400(res, err);
  }
};

const getAllPurchaseVouchers = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) return unauthorized(res);

    const vouchers = await PurchaseVoucher.find({ branch: authorize.branch })
      .populate("supplier")
      .populate("items.product")
      .sort({ date: -1 });

    return success_200(res, "Purchase Vouchers fetched", vouchers);
  } catch (err) {
    return catch_400(res, err);
  }
};

const getPurchaseVoucher = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) return unauthorized(res);

    const voucher = await PurchaseVoucher.findById(req.params.id)
      .populate("supplier")
      .populate("items.product");

    if (!voucher) return failed_400(res, "Voucher not found");
    if (voucher.branch.toString() !== authorize.branch.toString()) {
      return unauthorized(res);
    }

    return success_200(res, "Voucher fetched", voucher);
  } catch (err) {
    return catch_400(res, err);
  }
};

const updateVoucher = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) return unauthorized(res);

    const { status } = req.body;
    const voucher = await PurchaseVoucher.findById(req.params.id);

    if (!voucher) return failed_400(res, "Voucher not found");
    if (voucher.branch.toString() !== authorize.branch.toString()) {
      return unauthorized(res);
    }

    // Validate status value
    if (![0, 1].includes(status)) {
      return failed_400(res, "Invalid status value");
    }

    const updatedVoucher = await PurchaseVoucher.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    return success_200(res, "Status updated", updatedVoucher);
  } catch (err) {
    return catch_400(res, err);
  }
};

const deletePurchaseVoucher = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) return unauthorized(res);

    const voucher = await PurchaseVoucher.findById(req.params.id);
    if (!voucher) return failed_400(res, "Voucher not found");
    if (voucher.branch.toString() !== authorize.branch.toString()) {
      return unauthorized(res);
    }

    await PurchaseVoucher.findByIdAndDelete(req.params.id);
    return success_200(res, "Voucher deleted");
  } catch (err) {
    return catch_400(res, err);
  }
};

module.exports = {
  createPurchaseVoucher,
  getAllPurchaseVouchers,
  getPurchaseVoucher,
  updateVoucher,
  deletePurchaseVoucher,
};