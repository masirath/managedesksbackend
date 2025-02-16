const { parse } = require("dotenv");
const { authorization } = require("../Global/authorization");
const { catch_400, unauthorized, success_200 } = require("../Global/errors");
const inventories = require("../Models/inventories");
const invoices = require("../Models/invoices");
const invoices_payments = require("../Models/invoices_payments");
const products = require("../Models/products");
const purchase_orders = require("../Models/purchase_orders");
const { default: mongoose } = require("mongoose");
const requests = require("../Models/requests");
const sales_returns = require("../Models/sales_returns");
const sales_returns_payments = require("../Models/sales_returns_payments");
const invoices_details = require("../Models/invoices_details");
const purchases_orders_payment = require("../Models/purchases_orders_payment");
const purchase_orders_payments = require("../Models/purchase_orders_payments");

const get_dashboard = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) return unauthorized(res);

    const { date } = req?.body;
    if (!date) return res.status(400).json({ message: "Date is required" });

    // Convert the received date into a valid Date object and extract the day range
    const selectedDate = new Date(date);
    const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));

    // Run all count queries in parallel
    const [
      total_products,
      total_inventories,
      all_products,
      all_invoices,
      all_sales_returns,
      recent_invoices,
      inventory_requestes,
    ] = await Promise.all([
      products.countDocuments({
        ref: authorize.ref,
        branch: authorize.branch,
        status: 1,
      }),
      inventories.countDocuments({
        ref: authorize.ref,
        branch: authorize.branch,
        status: 1,
        stock: { $gt: 0 },
      }),
      products.find(
        { ref: authorize.ref, branch: authorize.branch, status: 1 },
        { _id: 1, stock: 1, expiry: 1 }
      ),
      invoices.find({
        date: { $gte: startOfDay, $lt: endOfDay },
        ref: authorize.ref,
        branch: authorize.branch,
        status: 1,
      }),
      sales_returns.find({
        date: { $gte: startOfDay, $lt: endOfDay },
        ref: authorize.ref,
        branch: authorize.branch,
        status: 1,
      }),
      invoices
        .find({
          date: { $gte: startOfDay, $lt: endOfDay },
          ref: authorize.ref,
          branch: authorize.branch,
          status: 1,
        })
        .populate("created_by")
        .sort({ date: -1 })
        .limit(5),
      requests
        .find({
          date: { $gte: startOfDay, $lt: endOfDay },
          ref: authorize.ref,
          supplier: authorize.branch,
          status: 1,
        })
        .populate("branch")
        .populate("created_by")
        .sort({ date: -1 })
        .limit(5),
    ]);

    // Get all inventory data in a single query
    const productIds = all_products.map((p) => p._id);
    const product_inventories = await inventories.find({
      product: { $in: productIds },
      ref: authorize.ref,
      branch: authorize.branch,
      status: 1,
      stock: { $gt: 0 },
    });

    let total_low_stock = 0,
      total_out_of_stock = 0,
      total_expired = 0,
      total_near_expiry = 0;

    // Preprocess inventory data
    const inventoryMap = {};
    product_inventories.forEach((inv) => {
      if (!inventoryMap[inv.product]) inventoryMap[inv.product] = [];
      inventoryMap[inv.product].push(inv);
    });

    // Compute stock and expiry-related stats
    all_products.forEach((product) => {
      const inventories = inventoryMap[product._id] || [];
      const totalStock = inventories.reduce(
        (sum, inv) => sum + (parseFloat(inv.stock) || 0),
        0
      );

      if (totalStock <= 0) {
        total_out_of_stock++;
      } else if (product.stock > 0 && totalStock <= product.stock) {
        total_low_stock++;
      }

      inventories.forEach((inv) => {
        if (inv.expiry_date) {
          if (new Date(inv.expiry_date) <= new Date()) {
            total_expired++;
          }
          if (product?.expiry > 0) {
            const daysToExpiry = Math.ceil(
              (new Date(inv.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
            );

            if (daysToExpiry > 0) {
              if (daysToExpiry <= product.expiry) total_near_expiry++;
            }
          }
        }
      });
    });

    // Process invoice data
    let total_sales = 0;
    let total_discount = 0;
    let total_delivery = 0;
    let total_cash = 0;
    let total_debit_card = 0;
    let total_credit_card = 0;
    let total_bank_transfer = 0;
    let total_online_payment = 0;
    let total_cheque = 0;
    let total_customer_paid = 0;
    let total_customer_payable = 0;

    const invoiceIds = all_invoices.map((i) => i._id);
    const invoice_payments = await invoices_payments.find({
      invoice: { $in: invoiceIds },
    });

    const paymentMap = {};
    invoice_payments.forEach((p) => {
      if (!paymentMap[p.invoice]) paymentMap[p.invoice] = [];
      paymentMap[p.invoice].push(p);
    });

    all_invoices.forEach((invoice) => {
      total_sales += parseFloat(invoice.total) || 0;
      total_discount += parseFloat(invoice.discount) || 0;
      total_delivery += parseFloat(invoice.delivery) || 0;

      let invoice_paid = 0;

      (paymentMap[invoice._id] || []).forEach((payment) => {
        const amount = parseFloat(payment.amount) || 0;
        invoice_paid += amount;

        switch (payment.name) {
          case "Cash":
            total_cash += amount;
            break;
          case "Debit card":
            total_debit_card += amount;
            break;
          case "Credit card":
            total_credit_card += amount;
            break;
          case "Bank transfer":
            total_bank_transfer += amount;
            break;
          case "Online payment":
            total_online_payment += amount;
            break;
          case "Cheque":
            total_cheque += amount;
            break;
        }
      });

      total_customer_paid += invoice_paid;
      total_customer_payable += parseFloat(invoice.total) - invoice_paid;
    });

    // Process sales returns data
    let total_sales_returns_sales = 0;
    let total_sales_returns_discount = 0;
    let total_sales_returns_delivery = 0;
    let total_sales_returns_cash = 0;
    let total_sales_returns_debit_card = 0;
    let total_sales_returns_credit_card = 0;
    let total_sales_returns_bank_transfer = 0;
    let total_sales_returns_online_payment = 0;
    let total_sales_returns_cheque = 0;
    let total_sales_returns_customer_paid = 0;
    let total_sales_returns_customer_payable = 0;

    const salesReturnsIds = all_sales_returns.map((i) => i._id);
    const sales_return_payments = await sales_returns_payments.find({
      sales_return: { $in: salesReturnsIds },
    });

    // Group payments by sales return
    const salesReturnPaymentMap = {};
    sales_return_payments.forEach((p) => {
      if (!salesReturnPaymentMap[p.sales_return])
        salesReturnPaymentMap[p.sales_return] = [];
      salesReturnPaymentMap[p.sales_return].push(p);
    });

    all_sales_returns.forEach((sales_return) => {
      total_sales_returns_sales += parseFloat(sales_return.total) || 0;
      total_sales_returns_discount += parseFloat(sales_return.discount) || 0;
      total_sales_returns_delivery += parseFloat(sales_return.delivery) || 0;

      let sales_returns_paid = 0;

      (salesReturnPaymentMap[sales_return._id] || []).forEach((payment) => {
        const amount = parseFloat(payment.amount) || 0;
        sales_returns_paid += amount;

        switch (payment.name) {
          case "Cash":
            total_sales_returns_cash += amount;
            break;
          case "Debit card":
            total_sales_returns_debit_card += amount;
            break;
          case "Credit card":
            total_sales_returns_credit_card += amount;
            break;
          case "Bank transfer":
            total_sales_returns_bank_transfer += amount;
            break;
          case "Online payment":
            total_sales_returns_online_payment += amount;
            break;
          case "Cheque":
            total_sales_returns_cheque += amount;
            break;
        }
      });

      total_sales_returns_customer_paid += sales_returns_paid;
      total_sales_returns_customer_payable +=
        parseFloat(sales_return.total) - sales_returns_paid;
    });

    let data = {
      total_products,
      total_inventories,
      total_low_stock,
      total_out_of_stock,
      total_expired,
      total_near_expiry,
      total_sales,
      total_discount,
      total_delivery,
      total_cash,
      total_debit_card,
      total_credit_card,
      total_bank_transfer,
      total_online_payment,
      total_cheque,
      total_customer_paid,
      total_customer_payable,
      total_sales_returns_sales,
      total_sales_returns_discount,
      total_sales_returns_delivery,
      total_sales_returns_cash,
      total_sales_returns_debit_card,
      total_sales_returns_credit_card,
      total_sales_returns_bank_transfer,
      total_sales_returns_online_payment,
      total_sales_returns_cheque,
      total_sales_returns_customer_paid,
      total_sales_returns_customer_payable,
      recent_invoices,
      inventory_requestes,
    };

    // Send response
    success_200(res, "", data);
  } catch (error) {
    catch_400(res, error.message);
  }
};

const get_all_products_reports = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (!authorize) {
      return unauthorized(res);
    }

    const { search, sort, unit, category, brand, type, branch, status } =
      req?.body;

    // Define the base filter for products
    const branchObjectId = new mongoose.Types.ObjectId(
      branch ? branch : authorize?.branch
    );

    const productList = {
      branch: branchObjectId,
      status: { $ne: 2 },
    };

    if (search) productList.name = { $regex: search, $options: "i" };
    if (unit) productList.unit = new mongoose.Types.ObjectId(unit);
    if (category) productList.category = new mongoose.Types.ObjectId(category);
    if (brand) productList.brand = new mongoose.Types.ObjectId(brand);
    if (type != null) productList.type = type;
    if (status != null) productList.status = status;

    // Sort based on inventory or name
    const inventorySort =
      sort === 1
        ? { name: -1 } // Low to high
        : sort === 2
        ? { total_inventory: 1 } // Low to high
        : sort === 3
        ? { total_inventory: -1 } // High to low
        : { name: 1 }; // Default sort by name

    // Aggregation pipeline
    const pipeline = [
      { $match: productList },
      {
        $lookup: {
          from: "inventories",
          localField: "_id",
          foreignField: "product",
          as: "product_inventories",
          pipeline: [
            {
              $match: {
                status: 1,
                stock: { $gt: 0, $ne: null, $ne: Infinity, $ne: undefined },
              },
            },
          ],
        },
      },

      {
        $addFields: {
          total_inventory: {
            $sum: {
              $map: {
                input: "$product_inventories",
                as: "inventory",
                in: {
                  $cond: {
                    if: { $gt: [{ $ifNull: ["$$inventory.stock", 0] }, 0] },
                    then: "$$inventory.stock",
                    else: 0,
                  },
                },
              },
            },
          },
        },
      },

      { $sort: inventorySort },

      {
        $lookup: {
          from: "branches",
          localField: "branch",
          foreignField: "_id",
          as: "branch",
        },
      },
      {
        $addFields: {
          branch: { $arrayElemAt: ["$branch", 0] },
        },
      },

      {
        $lookup: {
          from: "product_units",
          localField: "unit",
          foreignField: "_id",
          as: "unit",
        },
      },
      {
        $lookup: {
          from: "product_categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $lookup: {
          from: "product_brands",
          localField: "brand",
          foreignField: "_id",
          as: "brand",
        },
      },

      {
        $addFields: {
          unit: { $arrayElemAt: ["$unit", 0] },
          category: { $arrayElemAt: ["$category", 0] },
          brand: { $arrayElemAt: ["$brand", 0] },
        },
      },
    ];

    const results = await products.aggregate(pipeline).exec();

    // Calculate grand total inventory
    const grand_total_inventory = results.reduce(
      (sum, product) => sum + parseFloat(product.total_inventory || 0),
      0
    );

    // Send response
    success_200(res, "", {
      totalCount: results.length,
      grand_total_inventory,
      data: results,
    });
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_products_low_reports = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (!authorize) {
      return unauthorized(res);
    }

    const { search, sort, unit, category, brand, type, status, branch } =
      req?.body;

    // Define the base filter for products
    const branchObjectId = new mongoose.Types.ObjectId(
      branch ? branch : authorize?.branch
    );

    const productList = {
      branch: branchObjectId,
      status: { $ne: 2 },
    };

    if (search) productList.name = { $regex: search, $options: "i" };
    if (unit) productList.unit = new mongoose.Types.ObjectId(unit);
    if (category) productList.category = new mongoose.Types.ObjectId(category);
    if (brand) productList.brand = new mongoose.Types.ObjectId(brand);
    if (type != null) productList.type = type;
    if (status != null) productList.status = status;

    // Sort based on inventory or name
    const inventorySort =
      sort === 1
        ? { name: -1 } // Low to high
        : sort === 2
        ? { total_inventory: 1 } // Low to high
        : sort === 3
        ? { total_inventory: -1 } // High to low
        : { name: 1 }; // Default sort by name

    // Aggregation pipeline
    const pipeline = [
      { $match: productList },
      {
        $lookup: {
          from: "inventories",
          localField: "_id",
          foreignField: "product",
          as: "product_inventories",
          pipeline: [
            {
              $match: {
                status: 1,
                stock: { $gt: 0, $ne: null, $ne: Infinity, $ne: undefined },
              },
            },
          ],
        },
      },

      {
        $addFields: {
          total_inventory: {
            $sum: {
              $map: {
                input: "$product_inventories",
                as: "inventory",
                in: {
                  $cond: {
                    if: { $gt: [{ $ifNull: ["$$inventory.stock", 0] }, 0] },
                    then: "$$inventory.stock",
                    else: 0,
                  },
                },
              },
            },
          },
        },
      },

      {
        $match: {
          $expr: {
            $lt: ["$total_inventory", "$stock"],
          },
        },
      },

      { $sort: inventorySort },

      {
        $lookup: {
          from: "branches",
          localField: "branch",
          foreignField: "_id",
          as: "branch",
        },
      },
      {
        $addFields: {
          branch: { $arrayElemAt: ["$branch", 0] },
        },
      },

      {
        $lookup: {
          from: "product_units",
          localField: "unit",
          foreignField: "_id",
          as: "unit",
        },
      },
      {
        $lookup: {
          from: "product_categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $lookup: {
          from: "product_brands",
          localField: "brand",
          foreignField: "_id",
          as: "brand",
        },
      },

      {
        $addFields: {
          unit: { $arrayElemAt: ["$unit", 0] },
          category: { $arrayElemAt: ["$category", 0] },
          brand: { $arrayElemAt: ["$brand", 0] },
        },
      },
    ];

    const results = await products.aggregate(pipeline).exec();

    // Calculate grand total inventory
    const grand_total_inventory = results.reduce(
      (sum, product) => sum + parseFloat(product.total_inventory || 0),
      0
    );

    // Send response
    success_200(res, "", {
      totalCount: results.length,
      grand_total_inventory,
      data: results,
    });
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_products_out_of_stock_reports = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (!authorize) {
      return unauthorized(res);
    }

    const { search, sort, unit, category, brand, type, status, branch } =
      req?.body;

    // Define the base filter for products
    const branchObjectId = new mongoose.Types.ObjectId(
      branch ? branch : authorize?.branch
    );

    const productList = {
      branch: branchObjectId,
      status: { $ne: 2 },
    };

    if (search) productList.name = { $regex: search, $options: "i" };
    if (unit) productList.unit = new mongoose.Types.ObjectId(unit);
    if (category) productList.category = new mongoose.Types.ObjectId(category);
    if (brand) productList.brand = new mongoose.Types.ObjectId(brand);
    if (type != null) productList.type = type;
    if (status != null) productList.status = status;

    // Sort based on inventory or name
    const inventorySort =
      sort === 2
        ? { total_inventory: 1 } // Low to high
        : sort === 3
        ? { total_inventory: -1 } // High to low
        : { name: 1 }; // Default sort by name

    // Aggregation pipeline
    const pipeline = [
      { $match: productList },
      {
        $lookup: {
          from: "inventories",
          localField: "_id",
          foreignField: "product",
          as: "product_inventories",
          pipeline: [
            {
              $match: {
                status: 1,
                stock: { $gt: 0, $ne: null, $ne: Infinity, $ne: undefined },
              },
            },
          ],
        },
      },

      {
        $addFields: {
          total_inventory: {
            $sum: {
              $map: {
                input: "$product_inventories",
                as: "inventory",
                in: {
                  $cond: {
                    if: { $gt: [{ $ifNull: ["$$inventory.stock", 0] }, 0] },
                    then: "$$inventory.stock",
                    else: 0,
                  },
                },
              },
            },
          },
        },
      },

      {
        $match: {
          total_inventory: 0,
        },
      },

      { $sort: inventorySort },

      {
        $lookup: {
          from: "branches",
          localField: "branch",
          foreignField: "_id",
          as: "branch",
        },
      },
      {
        $addFields: {
          branch: { $arrayElemAt: ["$branch", 0] },
        },
      },

      {
        $lookup: {
          from: "product_units",
          localField: "unit",
          foreignField: "_id",
          as: "unit",
        },
      },
      {
        $lookup: {
          from: "product_categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $lookup: {
          from: "product_brands",
          localField: "brand",
          foreignField: "_id",
          as: "brand",
        },
      },

      {
        $addFields: {
          unit: { $arrayElemAt: ["$unit", 0] },
          category: { $arrayElemAt: ["$category", 0] },
          brand: { $arrayElemAt: ["$brand", 0] },
        },
      },
    ];

    const results = await products.aggregate(pipeline).exec();

    // Calculate grand total inventory
    const grand_total_inventory = results.reduce(
      (sum, product) => sum + parseFloat(product.total_inventory || 0),
      0
    );

    // Send response
    success_200(res, "", {
      totalCount: results.length,
      grand_total_inventory,
      data: results,
    });
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_inventories_reports = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (!authorize) {
      return unauthorized(res);
    }

    const {
      search,
      sort,
      product,
      supplier,
      purchase,
      date,
      type,
      branch,
      status,
    } = req.body;

    const inventoryList = {
      branch: branch ? branch : authorize.branch,
      status: { $ne: 2 },
      stock: { $gt: 0 },
    };
    if (product) inventoryList.product = product;
    if (supplier) inventoryList.supplier = supplier;
    if (purchase) inventoryList.purchase = purchase;
    if (type != null) inventoryList.type = type;
    if (status != null) inventoryList.status = status;
    if (date?.start && date?.end) {
      inventoryList.expiry_date = {
        $gte: new Date(date.start),
        $lte: new Date(date.end),
      };
    }

    let sortOption = { created: -1 };
    if (sort === 0) sortOption = { stock: 1 };
    else if (sort === 1) sortOption = { stock: -1 };

    // Fetch product IDs matching the search query
    let productIds = [];
    if (search) {
      const matchingProducts = await products
        .find({
          $or: [
            { name: { $regex: search, $options: "i" } },
            { barcode: { $regex: search, $options: "i" } },
          ],
        })
        .select("_id");

      productIds = matchingProducts.map((p) => p._id);
    }

    // Apply product search if productIds are found
    if (productIds.length > 0) {
      inventoryList.product = { $in: productIds };
    } else if (search) {
      // If search is provided but no matching products, return empty result
      return success_200(res, "", {
        totalCount: 0,
        data: [],
      });
    }

    // Fetch all matching inventories
    const all_inventories = await inventories
      .find(inventoryList)
      .populate({
        path: "product",
        populate: { path: "unit" },
      })
      .populate("purchase")
      .populate("supplier")
      .populate("branch")
      .sort(sortOption);

    // Calculate total, margin, and grand_total
    let grand_total = 0;
    const inventoryData = all_inventories.map((inventory) => {
      const price_per_unit = parseFloat(inventory.price_per_unit) || 0;
      const stock = parseFloat(inventory.stock) || 0;
      const sale_price = parseFloat(inventory.sale_price) || 0;

      // Calculate total
      const total = price_per_unit * stock;
      grand_total += total;

      // Calculate margin
      const margin =
        sale_price > 0 ? ((sale_price - price_per_unit) / sale_price) * 100 : 0;

      return {
        ...inventory.toObject(),
        total, // Add total key for each inventory
        margin, // Add margin key for each inventory
      };
    });

    success_200(res, "", {
      totalCount: all_inventories.length,
      data: inventoryData,
      grand_total, // Include grand_total
    });
  } catch (error) {
    catch_400(res, error?.message);
  }
};

const get_all_inventories_near_expiry_reports = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) return unauthorized(res);

    const { start, end } = req?.body;
    // const formattedDate = new Date(date).toISOString().split("T")[0];

    // Get all products
    const all_products = await products.find(
      { ref: authorize.ref, branch: authorize.branch, status: 1 }
      // { _id: 1, stock: 1, expiry: 1 }
    );

    // Get all inventory data in a single query
    const productIds = all_products.map((p) => p._id);
    const product_inventories = await inventories.find({
      product: { $in: productIds },
      ref: authorize.ref,
      branch: authorize.branch,
      status: 1,
      stock: { $gt: 0 },
    });

    let near_expiry_products = [];

    // Preprocess inventory data
    const inventoryMap = {};
    product_inventories.forEach((inv) => {
      if (!inventoryMap[inv.product]) inventoryMap[inv.product] = [];
      inventoryMap[inv.product].push(inv);
    });

    // Compute near expiry data
    all_products.forEach((product) => {
      const inventories = inventoryMap[product._id] || [];

      inventories.forEach((inv) => {
        if (inv.expiry_date) {
          if (product?.expiry > 0) {
            const daysToExpiry = Math.ceil(
              (new Date(inv.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
            );

            if (daysToExpiry > 0 && daysToExpiry <= product.expiry) {
              near_expiry_products.push({
                product: product?._id,
                product_name: product?.name,
                stock: inv.stock,
                expiry: product?.expiry,
                expiry_date: inv.expiry_date,
                days_to_expiry: daysToExpiry,
              });
            }
          }
        }
      });
    });

    // Send response with near-expiry data
    success_200(res, "", {
      near_expiry_products,
    });
  } catch (error) {
    catch_400(res, error.message);
  }
};

const get_all_inventories_expired_reports = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) return unauthorized(res);

    // Find expired inventories where expiry_date is less than the current date
    const expired_inventories = await inventories
      .find({
        ref: authorize.ref,
        branch: authorize.branch,
        status: 1,
        expiry_date: { $lt: new Date() }, // Only expired inventories (expiry date < current date)
        stock: { $gt: 0 }, // Ensure there's stock available
      })
      .populate("product") // Populate product details
      .sort({ expiry_date: 1 }); // Sort by expiry date in ascending order (earliest expiry first)

    // If no expired inventories found, return a message
    if (expired_inventories.length === 0) {
      return success_200(res, "No expired inventories found.");
    }

    // Prepare the response data
    const expired_data = expired_inventories.map((inventory) => ({
      ...inventory?.toObject(),
    }));

    // Send response with expired inventory data
    success_200(res, "", expired_data);
  } catch (error) {
    catch_400(res, error.message);
  }
};

const get_sales_reports = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) return unauthorized(res);

    const { date, branch, customer } = req?.body;

    let start, end;

    if (date?.start && date?.end) {
      // Parse provided dates
      start = new Date(date.start);
      end = new Date(date.end);
    } else {
      // If date is not provided, use today's date
      start = new Date();
      start.setHours(0, 0, 0, 0);

      end = new Date();
      end.setHours(23, 59, 59, 999);
    }

    // Validate if the dates are correct
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return catch_400(res, "Invalid date format. Please provide valid dates.");
    }

    // Ensure start date is earlier than end date
    if (start > end) {
      [start, end] = [end, start];
    }

    // Build query conditions
    const queryConditions = {
      date: {
        $gte: start,
        $lt: new Date(end.setDate(end.getDate() + 1)), // Include full day
      },
      ref: authorize.ref,
      branch: branch ? branch : authorize.branch,
      status: 1,
    };

    // If customer is provided, filter by customer
    if (customer) {
      queryConditions.customer = customer;
    }

    // Get invoices for the specified date range and customer (if provided)
    const all_invoices = await invoices
      .find(queryConditions)
      ?.populate("customer")
      ?.populate("branch");

    // Get related payments for the invoices
    const invoiceIds = all_invoices.map((i) => i._id);
    const invoice_payments = await invoices_payments.find({
      invoice: { $in: invoiceIds },
    });

    const paymentMap = {};
    invoice_payments.forEach((p) => {
      if (!paymentMap[p.invoice]) paymentMap[p.invoice] = [];
      paymentMap[p.invoice].push(p);
    });

    // Prepare a report for each invoice
    const invoiceReports = all_invoices.map((invoice) => {
      let total_sales = parseFloat(invoice.total) || 0;
      let total_discount = parseFloat(invoice.discount) || 0;
      let total_delivery = parseFloat(invoice.delivery) || 0;

      let invoice_paid = 0;
      let total_cash = 0;
      let total_debit_card = 0;
      let total_credit_card = 0;
      let total_bank_transfer = 0;
      let total_online_payment = 0;
      let total_cheque = 0;

      (paymentMap[invoice._id] || []).forEach((payment) => {
        const amount = parseFloat(payment.amount) || 0;
        invoice_paid += amount;

        switch (payment.name) {
          case "Cash":
            total_cash += amount;
            break;
          case "Debit card":
            total_debit_card += amount;
            break;
          case "Credit card":
            total_credit_card += amount;
            break;
          case "Bank transfer":
            total_bank_transfer += amount;
            break;
          case "Online payment":
            total_online_payment += amount;
            break;
          case "Cheque":
            total_cheque += amount;
            break;
        }
      });

      const customer_paid = invoice_paid;
      const customer_payable = total_sales - invoice_paid;

      // Return a detailed invoice report
      return {
        ...invoice?.toObject(),
        total_sales,
        total_discount,
        total_delivery,
        total_cash,
        total_debit_card,
        total_credit_card,
        total_bank_transfer,
        total_online_payment,
        total_cheque,
        total_paid: customer_paid,
        total_payable: customer_payable,
      };
    });

    // Send response with invoice-wise sales data
    success_200(res, "", invoiceReports);
  } catch (error) {
    catch_400(res, error.message);
  }
};

const get_purchase_reports = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) return unauthorized(res);

    const { date, branch, supplier } = req?.body;

    let start, end;

    if (date?.start && date?.end) {
      start = new Date(date.start);
      end = new Date(date.end);
    } else {
      start = new Date();
      start.setHours(0, 0, 0, 0);

      end = new Date();
      end.setHours(23, 59, 59, 999);
    }

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return catch_400(res, "Invalid date format. Please provide valid dates.");
    }

    if (start > end) {
      [start, end] = [end, start];
    }

    const queryConditions = {
      date: {
        $gte: start,
        $lt: new Date(end.setDate(end.getDate() + 1)), // Include full end day
      },
      ref: authorize.ref,
      branch: branch || authorize.branch,
      status: 1,
    };

    if (supplier) {
      queryConditions.supplier = supplier;
    }

    const all_purchase_orders = await purchase_orders
      .find(queryConditions)
      .populate("supplier")
      .populate("branch");

    const purchaseOrderIds = all_purchase_orders.map((i) => i._id);
    const purchase_order_payments = await purchase_orders_payments.find({
      purchase: { $in: purchaseOrderIds },
    });

    const paymentMap = {};
    purchase_order_payments.forEach((p) => {
      if (!paymentMap[p.purchase]) paymentMap[p.purchase] = [];
      paymentMap[p.purchase].push(p);
    });

    const purchaseOrderReports = all_purchase_orders.map((purchase_order) => {
      let total_purchase = parseFloat(purchase_order.total) || 0;
      let total_discount = parseFloat(purchase_order.discount) || 0;
      let total_delivery = parseFloat(purchase_order.delivery) || 0;

      let purchase_order_paid = 0;
      let total_cash = 0;
      let total_debit_card = 0;
      let total_credit_card = 0;
      let total_bank_transfer = 0;
      let total_online_payment = 0;
      let total_cheque = 0;

      (paymentMap[purchase_order._id] || []).forEach((payment) => {
        const amount = parseFloat(payment.amount) || 0;
        purchase_order_paid += amount;

        switch (
          payment.name // Ensure this field is consistent with sales reports
        ) {
          case "Cash":
            total_cash += amount;
            break;
          case "Debit card":
            total_debit_card += amount;
            break;
          case "Credit card":
            total_credit_card += amount;
            break;
          case "Bank transfer":
            total_bank_transfer += amount;
            break;
          case "Online payment":
            total_online_payment += amount;
            break;
          case "Cheque":
            total_cheque += amount;
            break;
        }
      });

      const supplier_payable = total_purchase - purchase_order_paid;

      return {
        ...purchase_order.toObject(),
        total_purchase,
        total_discount,
        total_delivery,
        total_cash,
        total_debit_card,
        total_credit_card,
        total_bank_transfer,
        total_online_payment,
        total_cheque,
        total_paid: purchase_order_paid,
        total_payable: supplier_payable,
      };
    });

    success_200(res, "", purchaseOrderReports);
  } catch (error) {
    catch_400(res, error.message);
  }
};

module.exports = {
  get_dashboard,
  get_all_products_reports,
  get_all_products_low_reports,
  get_all_products_out_of_stock_reports,
  get_all_inventories_reports,
  get_all_inventories_near_expiry_reports,
  get_all_inventories_expired_reports,
  get_sales_reports,
  get_purchase_reports,
};
