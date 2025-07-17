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
const purchases_returns = require("../Models/purchases_returns");
const purchases_returns_payments = require("../Models/purchases_returns_payments");
const expenses = require("../Models/expenses");
const roles = require("../Models/roles");
const roles_details = require("../Models/roles_details");
const moment = require("moment-timezone");
const purchase_orders_details = require("../Models/purchase_orders_details");
const received_details = require("../Models/received_details");

const get_dashboard = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) return unauthorized(res);

    let viewpurchase = false;
    if (authorize?.role != "SUPERADMIN") {
      const get_role_details = await roles_details?.find({
        role: authorize?.role,
      });

      for (value of get_role_details) {
        if (value?.name == "Purchases" && value?.view) {
          viewpurchase = true;
        }
      }
    } else if (authorize?.role == "SUPERADMIN") {
      viewpurchase = true;
    } else {
      viewpurchase = false;
    }

    const { date, branch, timezone, key } = req?.body;
    if (!date) return res.status(400).json({ message: "Date is required" });

    let selected_branch = authorize?.branch;
    let selected_supplier = authorize?.branch;

    if (branch == "ALL" && authorize?.role == "SUPERADMIN") {
      selected_branch = "ALL";
      selected_supplier = "ALL";
    } else if (branch != "ALL" && authorize?.role == "SUPERADMIN") {
      selected_branch = branch ? branch : authorize?.branch;
      selected_supplier = branch ? branch : authorize?.branch;
    }

    const queryConditions = { ref: authorize.ref };
    if (selected_branch !== "ALL") {
      queryConditions.branch = selected_branch;
    }

    const requestQueryConditions = { ref: authorize.ref };
    if (selected_supplier !== "ALL") {
      requestQueryConditions.supplier = selected_supplier;
    }

    // Convert the received date into a valid Date object and extract the day range
    // const selectedDate = new Date(date);
    // const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
    // const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));

    const selectedDate = moment.tz(date, timezone).startOf("day");
    const startOfDay = selectedDate.toDate();
    const endOfDay = selectedDate.endOf("day").toDate();

    // Run all count queries in parallel
    const [
      total_products,
      total_inventories,
      all_products,
      all_invoices,
      all_sales_returns,
      all_purchases,
      all_purchase_returns,
      all_expenses,
      recent_invoices,
      inventory_requestes,
    ] = await Promise.all([
      products.countDocuments({
        ...queryConditions,
        // ref: authorize.ref,
        // branch: selected_branch,
        status: 1,
      }),
      inventories.countDocuments({
        ...queryConditions,
        // ref: authorize.ref,
        // branch: selected_branch,
        status: 1,
        stock: { $gt: 0 },
      }),
      products.find(
        { ...queryConditions, status: 1 }
        // { ref: authorize.ref, branch: selected_branch, status: 1 },
        // { _id: 1, }
      ),
      invoices.find({
        ...queryConditions,
        // ref: authorize.ref,
        // branch: selected_branch,
        date: { $gte: startOfDay, $lt: endOfDay },
        status: 1,
      }),
      sales_returns.find({
        ...queryConditions,
        // ref: authorize.ref,
        // branch: selected_branch,
        date: { $gte: startOfDay, $lt: endOfDay },
        status: 1,
      }),
      purchase_orders.find({
        ...queryConditions,
        date: { $gte: startOfDay, $lt: endOfDay },
        // ref: authorize.ref,
        // branch: selected_branch,
        status: 1,
      }),
      purchases_returns.find({
        ...queryConditions,
        date: { $gte: startOfDay, $lt: endOfDay },
        // ref: authorize.ref,
        // branch: selected_branch,
        status: 1,
      }),
      expenses.find({
        ...queryConditions,
        date: { $gte: startOfDay, $lt: endOfDay },
        // ref: authorize.ref,
        // branch: selected_branch,
        status: { $ne: 2 },
      }),
      invoices
        .find({
          ...queryConditions,
          date: { $gte: startOfDay, $lt: endOfDay },
          // ref: authorize.ref,
          // branch: selected_branch,
          status: 1,
        })
        .populate("created_by")
        .sort({ date: -1 })
        .limit(5),
      requests
        .find({
          date: { $gte: startOfDay, $lt: endOfDay },
          ...requestQueryConditions,
          // ref: authorize.ref,
          // supplier: authorize.branch,
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
      total_customer_payable +=
        parseFloat(invoice.total || 0) - parseFloat(invoice_paid || 0);
    });

    // Process sales returns data
    let total_sales_returns = 0;
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
      total_sales_returns += parseFloat(sales_return.total) || 0;
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

    // Process purchase data
    let total_purchases = 0;
    let total_purchases_discount = 0;
    let total_purchases_delivery = 0;
    let total_purchases_cash = 0;
    let total_purchases_debit_card = 0;
    let total_purchases_credit_card = 0;
    let total_purchases_bank_transfer = 0;
    let total_purchases_online_payment = 0;
    let total_purchases_cheque = 0;
    let total_supplier_paid = 0;
    let total_supplier_payable = 0;

    if (viewpurchase) {
      const purchaseIds = all_purchases.map((i) => i._id);
      const purchase_payments = await purchase_orders_payments.find({
        purchase: { $in: purchaseIds },
      });

      const purchasePaymentMap = {};
      purchase_payments.forEach((p) => {
        if (!purchasePaymentMap[p.purchase])
          purchasePaymentMap[p.purchase] = [];
        purchasePaymentMap[p.purchase].push(p);
      });

      all_purchases.forEach((purchase) => {
        total_purchases += parseFloat(purchase.total) || 0;
        total_purchases_discount += parseFloat(purchase.discount) || 0;
        total_purchases_delivery += parseFloat(purchase.delivery) || 0;

        let purchase_paid = 0;

        (purchasePaymentMap[purchase._id] || []).forEach((payment) => {
          const amount = parseFloat(payment.amount) || 0;
          purchase_paid += amount;

          switch (payment.name) {
            case "Cash":
              total_purchases_cash += amount;
              break;
            case "Debit card":
              total_purchases_debit_card += amount;
              break;
            case "Credit card":
              total_purchases_credit_card += amount;
              break;
            case "Bank transfer":
              total_purchases_bank_transfer += amount;
              break;
            case "Online payment":
              total_purchases_online_payment += amount;
              break;
            case "Cheque":
              total_purchases_cheque += amount;
              break;
          }
        });

        total_supplier_paid += purchase_paid;
        total_supplier_payable +=
          parseFloat(purchase.total || 0) - parseFloat(purchase_paid || 0);
      });
    }

    // Process purchase returns data
    let total_purchase_return = 0;
    let total_purchase_return_discount = 0;
    let total_purchase_return_delivery = 0;
    let total_purchase_return_cash = 0;
    let total_purchase_return_debit_card = 0;
    let total_purchase_return_credit_card = 0;
    let total_purchase_return_bank_transfer = 0;
    let total_purchase_return_online_payment = 0;
    let total_purchase_return_cheque = 0;
    let total_purchase_return_supplier_paid = 0;
    let total_purchase_return_supplier_payable = 0;

    if (viewpurchase) {
      const purchaseReturnsIds = all_purchase_returns.map((i) => i._id);
      const purchase_returns_payments = await purchases_returns_payments.find({
        purchases_return: { $in: purchaseReturnsIds },
      });

      const purchaseReturnPaymentMap = {};
      purchase_returns_payments.forEach((p) => {
        if (!purchaseReturnPaymentMap[p.purchases_return])
          purchaseReturnPaymentMap[p.purchases_return] = [];
        purchaseReturnPaymentMap[p.purchases_return].push(p);
      });

      all_purchase_returns.forEach((purchase_return) => {
        total_purchase_return += parseFloat(purchase_return.total) || 0;
        total_purchase_return_discount +=
          parseFloat(purchase_return.discount) || 0;
        total_purchase_return_delivery +=
          parseFloat(purchase_return.delivery) || 0;

        let purchase_return_paid = 0;

        (purchaseReturnPaymentMap[purchase_return._id] || []).forEach(
          (payment) => {
            const amount = parseFloat(payment.amount) || 0;
            purchase_return_paid += amount;

            switch (payment.name) {
              case "Cash":
                total_purchase_return_cash += amount;
                break;
              case "Debit card":
                total_purchase_return_debit_card += amount;
                break;
              case "Credit card":
                total_purchase_return_credit_card += amount;
                break;
              case "Bank transfer":
                total_purchase_return_bank_transfer += amount;
                break;
              case "Online payment":
                total_purchase_return_online_payment += amount;
                break;
              case "Cheque":
                total_purchase_return_cheque += amount;
                break;
            }
          }
        );

        total_purchase_return_supplier_paid += purchase_return_paid;
        total_purchase_return_supplier_payable +=
          parseFloat(purchase_return.total || 0) -
          parseFloat(purchase_return_paid || 0);
      });
    }

    let total_expenses = 0;
    let total_expenses_cash = 0;
    let total_expenses_debit_card = 0;
    let total_expenses_credit_card = 0;
    let total_expenses_bank_transfer = 0;
    let total_expenses_online_payment = 0;
    let total_expenses_return_cheque = 0;

    all_expenses.forEach((expenses) => {
      total_expenses += parseFloat(expenses.amount) || 0;

      const amount = parseFloat(expenses.amount) || 0;

      switch (expenses.name) {
        case "Cash":
          total_expenses_cash += amount;
          break;
        case "Debit card":
          total_expenses_debit_card += amount;
          break;
        case "Credit card":
          total_expenses_credit_card += amount;
          break;
        case "Bank transfer":
          total_expenses_bank_transfer += amount;
          break;
        case "Online payment":
          total_expenses_online_payment += amount;
          break;
        case "Cheque":
          total_expenses_return_cheque += amount;
          break;
      }
    });

    let grand_total = 0;

    let profit =
      parseFloat(total_sales || 0) + parseFloat(total_purchase_return || 0);
    let loss =
      parseFloat(total_purchases || 0) +
      parseFloat(total_sales_returns || 0) +
      parseFloat(total_expenses || 0);

    grand_total = parseFloat(profit || 0) - parseFloat(loss || 0);

    console.log(branch, "authorize");

    let data = {
      total_products,
      total_inventories,
      total_low_stock,
      total_out_of_stock,
      total_expired,
      total_near_expiry,
      //sales
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
      //sales return
      total_sales_returns,
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
      //purchases
      total_purchases,
      total_purchases_discount,
      total_purchases_delivery,
      total_purchases_cash,
      total_purchases_debit_card,
      total_purchases_credit_card,
      total_purchases_bank_transfer,
      total_purchases_online_payment,
      total_purchases_cheque,
      total_supplier_paid,
      total_supplier_payable,
      //purchases returns
      total_purchase_return,
      total_purchase_return_discount,
      total_purchase_return_delivery,
      total_purchase_return_cash,
      total_purchase_return_debit_card,
      total_purchase_return_credit_card,
      total_purchase_return_bank_transfer,
      total_purchase_return_online_payment,
      total_purchase_return_cheque,
      total_purchase_return_supplier_paid,
      total_purchase_return_supplier_payable,
      //expenses
      total_expenses,
      total_expenses_cash,
      total_expenses_debit_card,
      total_expenses_credit_card,
      total_expenses_bank_transfer,
      total_expenses_online_payment,
      total_expenses_return_cheque,
      // grand total
      grand_total,
      //other
      recent_invoices,
      inventory_requestes,
      //role
      role: authorize?.role,
      user: authorize,
      branch: "",
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

    let selected_branch = new mongoose.Types.ObjectId(authorize?.branch);

    if (branch == "ALL") {
      selected_branch = "ALL";
    } else {
      selected_branch = new mongoose.Types.ObjectId(
        branch ? branch : authorize?.branch
      );
    }

    const queryConditions = { ref: authorize.ref };
    if (selected_branch !== "ALL") {
      queryConditions.branch = selected_branch;
    }

    const productList = {
      ...queryConditions,
      // branch: branchObjectId,
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

    let selected_branch = new mongoose.Types.ObjectId(authorize?.branch);

    if (branch == "ALL") {
      selected_branch = "ALL";
    } else {
      selected_branch = new mongoose.Types.ObjectId(
        branch ? branch : authorize?.branch
      );
    }

    const queryConditions = { ref: authorize.ref };
    if (selected_branch !== "ALL") {
      queryConditions.branch = selected_branch;
    }

    const productList = {
      ...queryConditions,
      // branch: branchObjectId,
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
          total_inventory: { $gt: 0 },
          $expr: {
            $lte: ["$total_inventory", "$stock"],
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

    let selected_branch = new mongoose.Types.ObjectId(authorize?.branch);

    if (branch == "ALL") {
      selected_branch = "ALL";
    } else {
      selected_branch = new mongoose.Types.ObjectId(
        branch ? branch : authorize?.branch
      );
    }

    const queryConditions = { ref: authorize.ref };
    if (selected_branch !== "ALL") {
      queryConditions.branch = selected_branch;
    }

    const productList = {
      ...queryConditions,
      // branch: branchObjectId,
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

    let selected_branch = new mongoose.Types.ObjectId(authorize?.branch);

    if (branch == "ALL") {
      selected_branch = "ALL";
    } else {
      selected_branch = new mongoose.Types.ObjectId(
        branch ? branch : authorize?.branch
      );
    }

    const queryConditions = { ref: authorize.ref };
    if (selected_branch !== "ALL") {
      queryConditions.branch = selected_branch;
    }

    const inventoryList = {
      ...queryConditions,
      // branch: branch ? branch : authorize.branch,
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

    if (sort === 3) sortOption = { purchase_price: 1 };
    else if (sort === 4) sortOption = { purchase_price: -1 };
    else if (sort === 5) sortOption = { price_per_unit: 1 };
    else if (sort === 6) sortOption = { price_per_unit: -1 };
    else if (sort === 7) sortOption = { sale_price: 1 };
    else if (sort === 8) sortOption = { sale_price: -1 };
    else if (sort === 9) sortOption = { stock: 1 };
    else if (sort === 10) sortOption = { stock: -1 };
    else if (sort === 11) sortOption = { expiry_date: 1 };
    else if (sort === 12) sortOption = { expiry_date: -1 };

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
    let grand_sale_total = 0;
    const inventoryData = all_inventories.map((inventory) => {
      const price_per_unit = parseFloat(inventory.price_per_unit) || 0;
      const stock = parseFloat(inventory.stock) || 0;
      const sale_price = parseFloat(inventory.sale_price) || 0;

      // Calculate total
      const total = price_per_unit * stock;
      const total_sales = sale_price * stock;

      grand_total += total;
      grand_sale_total += total_sales;

      // Calculate margin
      const margin =
        sale_price > 0 ? ((sale_price - price_per_unit) / sale_price) * 100 : 0;

      // Calculate gain
      const gain = sale_price > 0 ? sale_price - price_per_unit : 0;

      return {
        ...inventory.toObject(),
        total,
        total_sales,
        margin,
        gain,
      };
    });

    if (sort === 1) {
      inventoryData.sort((a, b) =>
        (a.product?.name || "").localeCompare(b.product?.name || "")
      );
    } else if (sort === 2) {
      inventoryData.sort((a, b) =>
        (b.product?.name || "").localeCompare(a.product?.name || "")
      );
    } else if (sort === 13) inventoryData.sort((a, b) => a.margin - b.margin);
    else if (sort === 14) inventoryData.sort((a, b) => b.margin - a.margin);
    else if (sort === 15) inventoryData.sort((a, b) => a.gain - b.gain);
    else if (sort === 16) inventoryData.sort((a, b) => b.gain - a.gain);
    else if (sort === 17) inventoryData.sort((a, b) => a.total - b.total);
    else if (sort === 18) inventoryData.sort((a, b) => b.total - a.total);
    else if (sort === 19)
      inventoryData.sort((a, b) => a.total_sales - b.total_sales);
    else if (sort === 20)
      inventoryData.sort((a, b) => b.total_sales - a.total_sales);

    success_200(res, "", {
      totalCount: all_inventories.length,
      data: inventoryData,
      grand_total,
      grand_sale_total,
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
    const all_products = await products.find({
      ref: authorize.ref,
      branch: authorize.branch,
      status: 1,
    });

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
                ...inv?.toObject(),
                // product: product?._id,
                product_name: product?.name,
                stock: inv.stock,
                // expiry: product?.expiry,
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

    const { date, branch, customer, timezone } = req?.body;

    let selected_branch = new mongoose.Types.ObjectId(authorize?.branch);

    if (branch == "ALL") {
      selected_branch = "ALL";
    } else {
      selected_branch = new mongoose.Types.ObjectId(
        branch ? branch : authorize?.branch
      );
    }

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
        $lt: new Date(end.setDate(end.getDate() + 1)),
      },
      ref: authorize.ref,
      status: 1,
    };

    if (selected_branch !== "ALL") {
      queryConditions.branch = selected_branch;
    }

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

const get_sales_return_reports = async (req, res) => {
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

    // Get sales_returns for the specified date range and customer (if provided)
    const all_sales_returns = await sales_returns
      .find(queryConditions)
      ?.populate("customer")
      ?.populate("branch");

    // Get related payments for the sales_returns
    const sales_returnIds = all_sales_returns.map((i) => i._id);
    const sales_return_payments = await sales_returns_payments.find({
      sales_return: { $in: sales_returnIds },
    });

    const paymentMap = {};
    sales_return_payments.forEach((p) => {
      if (!paymentMap[p.sales_return]) paymentMap[p.sales_return] = [];
      paymentMap[p.sales_return].push(p);
    });

    // Prepare a report for each sales_return
    const sales_returnReports = all_sales_returns.map((sales_return) => {
      let total_sales = parseFloat(sales_return.total) || 0;
      let total_discount = parseFloat(sales_return.discount) || 0;
      let total_delivery = parseFloat(sales_return.delivery) || 0;

      let sales_return_paid = 0;
      let total_cash = 0;
      let total_debit_card = 0;
      let total_credit_card = 0;
      let total_bank_transfer = 0;
      let total_online_payment = 0;
      let total_cheque = 0;

      (paymentMap[sales_return._id] || []).forEach((payment) => {
        const amount = parseFloat(payment.amount) || 0;
        sales_return_paid += amount;

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

      const customer_paid = sales_return_paid;
      const customer_payable = total_sales - sales_return_paid;

      // Return a detailed sales_return report
      return {
        ...sales_return?.toObject(),
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

    // Send response with sales_return-wise sales data
    success_200(res, "", sales_returnReports);
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

const get_purchase_return_reports = async (req, res) => {
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

    const all_purchase_returns = await purchase_returns
      .find(queryConditions)
      .populate("supplier")
      .populate("branch");

    const purchaseOrderIds = all_purchase_returns.map((i) => i._id);
    const purchase_return_payments = await purchase_returns_payments.find({
      purchase: { $in: purchaseOrderIds },
    });

    const paymentMap = {};
    purchase_return_payments.forEach((p) => {
      if (!paymentMap[p.purchase]) paymentMap[p.purchase] = [];
      paymentMap[p.purchase].push(p);
    });

    const purchaseOrderReports = all_purchase_returns.map((purchase_return) => {
      let total_purchase = parseFloat(purchase_return.total) || 0;
      let total_discount = parseFloat(purchase_return.discount) || 0;
      let total_delivery = parseFloat(purchase_return.delivery) || 0;

      let purchase_return_paid = 0;
      let total_cash = 0;
      let total_debit_card = 0;
      let total_credit_card = 0;
      let total_bank_transfer = 0;
      let total_online_payment = 0;
      let total_cheque = 0;

      (paymentMap[purchase_return._id] || []).forEach((payment) => {
        const amount = parseFloat(payment.amount) || 0;
        purchase_return_paid += amount;

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

      const supplier_payable = total_purchase - purchase_return_paid;

      return {
        ...purchase_return.toObject(),
        total_purchase,
        total_discount,
        total_delivery,
        total_cash,
        total_debit_card,
        total_credit_card,
        total_bank_transfer,
        total_online_payment,
        total_cheque,
        total_paid: purchase_return_paid,
        total_payable: supplier_payable,
      };
    });

    success_200(res, "", purchaseOrderReports);
  } catch (error) {
    catch_400(res, error.message);
  }
};

const get_fast_moving_products_reports = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) return unauthorized(res);

    const { date, branch, timezone, sort } = req?.body;

    let selected_branch = new mongoose.Types.ObjectId(authorize?.branch);

    if (branch === "ALL") {
      selected_branch = "ALL";
    } else {
      selected_branch = new mongoose.Types.ObjectId(
        branch || authorize?.branch
      );
    }

    const queryConditions = {
      ref: authorize.ref,
      status: 1,
    };

    if (selected_branch !== "ALL") {
      queryConditions.branch = selected_branch;
    }

    if (date?.start && date?.end) {
      const start = moment
        .tz(date.start, timezone)
        .startOf("day")
        .utc()
        .toDate();
      const end = moment.tz(date.end, timezone).endOf("day").utc().toDate();
      queryConditions.created = { $gte: start, $lte: end };
    }

    const get_all_invoice_details = await invoices_details
      .find(queryConditions)
      .populate([
        {
          path: "invoice", // assuming `invoice` is the field referencing the invoice document
          match: { status: 1 }, // only include if the invoice has status 1
          select: "_id", // only need the id
        },
        {
          path: "description",
          populate: { path: "product", select: "name" },
        },
      ])
      .then((docs) => docs.filter((doc) => doc.invoice));

    let productSales = new Map();
    let grandTotalSold = 0;
    let grandTotalPurchase = 0;
    let grandTotalSale = 0;
    let grandTotalPricePerUnit = 0;
    let grandNetTotal = 0;
    let grandTotalMargin = 0;

    for (const invoice of get_all_invoice_details) {
      const productName = invoice.description?.product?.name;
      if (!productName) continue;

      const quantity = invoice.quantity || 0;
      const purchasePrice = invoice.purchase_price || 0;
      const salePrice = invoice.sale_price || 0;
      const pricePerUnit = invoice.price_per_unit || 0;

      if (!productSales.has(productName)) {
        productSales.set(productName, {
          productName,
          totalSold: 0,
          totalInvoices: 0,
          totalPurchasePrice: 0,
          totalSalePrice: 0,
          totalPricePerUnit: 0,
          netTotal: 0,
          margin: 0,
          marginPercentage: 0,
        });
      }

      const netAmount = (salePrice - pricePerUnit) * quantity;

      const productData = productSales.get(productName);
      productData.totalSold += quantity;
      productData.totalInvoices += 1;
      productData.totalPurchasePrice += purchasePrice * quantity;
      productData.totalSalePrice += salePrice * quantity;
      productData.totalPricePerUnit += pricePerUnit * quantity;
      productData.netTotal += netAmount;

      productData.margin =
        productData.totalSalePrice - productData.totalPricePerUnit;
      productData.marginPercentage = productData.totalSalePrice
        ? (productData.margin / productData.totalSalePrice) * 100
        : "0.00";

      grandTotalSold += quantity;
      grandTotalPurchase += purchasePrice * quantity;
      grandTotalSale += salePrice * quantity;
      grandTotalPricePerUnit += pricePerUnit * quantity;
      grandNetTotal += netAmount;
      grandTotalMargin += salePrice * quantity - purchasePrice * quantity;
    }

    const sortedProducts = [...productSales.values()].sort(
      (a, b) => b.totalSold - a.totalSold
    );

    if (sort === 0) {
      // alphabet (a-z)
      sortedProducts.sort((a, b) => a.productName.localeCompare(b.productName));
    } else if (sort === 1) {
      // alphabet (z-a)
      sortedProducts.sort((a, b) => b.productName.localeCompare(a.productName));
    } else if (sort === 2) {
      // quantity (low)
      sortedProducts.sort((a, b) => a.totalSold - b.totalSold);
    } else if (sort === 3) {
      // quantity (high)
      sortedProducts.sort((a, b) => b.totalSold - a.totalSold);
    } else if (sort === 4) {
      // purchase_price (low)
      sortedProducts.sort(
        (a, b) => a.totalPurchasePrice - b.totalPurchasePrice
      );
    } else if (sort === 5) {
      // purchase_price (high)
      sortedProducts.sort(
        (a, b) => b.totalPurchasePrice - a.totalPurchasePrice
      );
    } else if (sort === 6) {
      // sales_price (low)
      sortedProducts.sort((a, b) => a.totalSalePrice - b.totalSalePrice);
    } else if (sort === 7) {
      // sales_price (high)
      sortedProducts.sort((a, b) => b.totalSalePrice - a.totalSalePrice);
    } else if (sort === 8) {
      // price_per_unit (low)
      sortedProducts.sort((a, b) => a.totalPricePerUnit - b.totalPricePerUnit);
    } else if (sort === 9) {
      // price_per_unit (high)
      sortedProducts.sort((a, b) => b.totalPricePerUnit - a.totalPricePerUnit);
    } else if (sort === 10) {
      // netTotal (low)
      sortedProducts.sort((a, b) => a.netTotal - b.netTotal);
    } else if (sort === 11) {
      // netTotal (high)
      sortedProducts.sort((a, b) => b.netTotal - a.netTotal);
    } else if (sort === 10) {
      // netTotal (low)
      sortedProducts.sort((a, b) => a.netTotal - b.netTotal);
    } else if (sort === 11) {
      // netTotal (high)
      sortedProducts.sort((a, b) => b.netTotal - a.netTotal);
    } else if (sort === 12) {
      // marginPercentage (low)
      sortedProducts.sort((a, b) => a.marginPercentage - b.marginPercentage);
    } else if (sort === 13) {
      // marginPercentage (high)
      sortedProducts.sort((a, b) => b.marginPercentage - a.marginPercentage);
    }

    success_200(res, "", {
      grandTotalSold,
      grandTotalPurchase,
      grandTotalSale,
      grandTotalPricePerUnit,
      grandNetTotal,
      grandTotalMargin,
      data: sortedProducts,
    });
  } catch (error) {
    catch_400(res, error.message);
  }
};

const get_products_ageing_reports = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) return unauthorized(res);

    const { branch, timezone, sort, date } = req.body;

    const selected_branch =
      branch === "ALL"
        ? "ALL"
        : new mongoose.Types.ObjectId(branch || authorize?.branch);

    const matchConditions = {
      ref: authorize.ref,
      status: 1,
    };

    if (selected_branch !== "ALL") {
      matchConditions.branch = selected_branch;
    }

    let purchaseDateMatch = {};
    if (date?.start && date?.end) {
      const start = moment.tz(date.start, timezone).startOf("day").toDate();
      const end = moment.tz(date.end, timezone).endOf("day").toDate();
      purchaseDateMatch.date = { $gte: start, $lte: end };
      purchaseDateMatch.status = 1;
    }

    // 1. Fetch all purchase details + purchase data
    const purchaseDetailsRaw = await purchase_orders_details
      .find(matchConditions)
      .populate({
        path: "purchase",
        match: purchaseDateMatch,
      });

    const purchaseDetails = purchaseDetailsRaw.filter((pd) => pd?.purchase);

    // 2. Get all inventory IDs used in purchase details
    const inventoryIds = purchaseDetails
      .map((item) => item?.inventory)
      .filter(Boolean);

    // 3. Fetch all relevant inventories with products in one go
    const inventoryDocs = await inventories
      .find({ _id: { $in: inventoryIds }, status: 1 })
      .populate("product");

    // 4. Create a quick lookup map for inventories
    const inventoryMap = new Map(
      inventoryDocs.map((inv) => [inv._id.toString(), inv])
    );

    // 5. Process all data fast in one pass
    const now = new Date();
    const allProductAgeing = purchaseDetails
      .map((value) => {
        const inv = inventoryMap.get(value?.inventory?.toString());

        const stock = isFinite(inv?.stock) ? parseFloat(inv?.stock) : 0;

        if (!inv || parseFloat(stock?.toFixed?.(3)) <= 0) return null;

        const purchase_stock = parseFloat(value?.delivered || 0);
        const current_stock = parseFloat(stock || 0);
        const total_sold = purchase_stock - current_stock;
        const movement_percent =
          purchase_stock > 0
            ? parseFloat(((total_sold / purchase_stock) * 100).toFixed(2))
            : 0;

        return {
          name: inv?.product?.name,
          batch: inv?.number,
          purchase_date: value?.purchase?.date,
          purchase_stock,
          current_stock,
          total_sold,
          movement_percent,
          days: Math.floor(
            (now - new Date(value?.purchase?.date)) / (1000 * 60 * 60 * 24)
          ),
        };
      })
      .filter(Boolean); // Remove nulls

    allProductAgeing.sort(
      (a, b) => parseFloat(a.total_sold) - parseFloat(b.total_sold)
    );

    if (sort == 0) {
      allProductAgeing.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort == 1) {
      allProductAgeing.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sort == 2) {
      allProductAgeing.sort((a, b) => parseFloat(a.days) - parseFloat(b.days));
    } else if (sort == 3) {
      allProductAgeing.sort((a, b) => parseFloat(b.days) - parseFloat(a.days));
    } else if (sort == 4) {
      allProductAgeing.sort(
        (a, b) => parseFloat(a.purchase_stock) - parseFloat(b.purchase_stock)
      );
    } else if (sort == 5) {
      allProductAgeing.sort(
        (a, b) => parseFloat(b.purchase_stock) - parseFloat(a.purchase_stock)
      );
    } else if (sort == 6) {
      allProductAgeing.sort(
        (a, b) => parseFloat(a.current_stock) - parseFloat(b.current_stock)
      );
    } else if (sort == 7) {
      allProductAgeing.sort(
        (a, b) => parseFloat(b.current_stock) - parseFloat(a.current_stock)
      );
    } else if (sort == 8) {
      allProductAgeing.sort(
        (a, b) => parseFloat(a.total_sold) - parseFloat(b.total_sold)
      );
    } else if (sort == 9) {
      allProductAgeing.sort(
        (a, b) => parseFloat(b.total_sold) - parseFloat(a.total_sold)
      );
    } else if (sort == 10) {
      allProductAgeing.sort(
        (a, b) =>
          parseFloat(a.movement_percent) - parseFloat(b.movement_percent)
      );
    } else if (sort == 11) {
      allProductAgeing.sort(
        (a, b) =>
          parseFloat(b.movement_percent) - parseFloat(a.movement_percent)
      );
    }

    success_200(res, "Batch-wise product ageing fetched", allProductAgeing);
  } catch (err) {
    catch_400(res, err.message);
  }
};

const get_products_received_ageing_reports = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) return unauthorized(res);

    const { branch, timezone, sort, date } = req.body;

    const selected_branch =
      branch === "ALL"
        ? "ALL"
        : new mongoose.Types.ObjectId(branch || authorize?.branch);

    const matchConditions = {
      ref: authorize.ref,
      status: 1,
    };

    if (selected_branch !== "ALL") {
      matchConditions.branch = selected_branch;
    }

    let purchaseDateMatch = {};
    if (date?.start && date?.end) {
      const start = moment.tz(date.start, timezone).startOf("day").toDate();
      const end = moment.tz(date.end, timezone).endOf("day").toDate();
      purchaseDateMatch.date = { $gte: start, $lte: end };
      purchaseDateMatch.status = 1;
    }

    const purchaseDetailsRaw = await received_details
      .find(matchConditions)
      .populate({
        path: "purchase",
        match: purchaseDateMatch,
      });

    const purchaseDetails = purchaseDetailsRaw.filter((pd) => pd?.purchase);

    // 2. Get all inventory IDs used in purchase details
    const inventoryIds = purchaseDetails
      .map((item) => item?.inventory)
      .filter(Boolean);

    // 3. Fetch all relevant inventories with products in one go
    const inventoryDocs = await inventories
      .find({ _id: { $in: inventoryIds }, status: 1 })
      .populate("product");

    // 4. Create a quick lookup map for inventories
    const inventoryMap = new Map(
      inventoryDocs.map((inv) => [inv._id.toString(), inv])
    );

    // 5. Process all data fast in one pass
    const now = new Date();
    const allProductAgeing = purchaseDetails
      .map((value) => {
        const inv = inventoryMap.get(value?.inventory?.toString());

        const stock = isFinite(inv?.stock) ? parseFloat(inv?.stock) : 0;

        if (!inv || parseFloat(stock?.toFixed?.(3)) <= 0) return null;

        const purchase_stock = parseFloat(value?.delivered || 0);
        const current_stock = parseFloat(stock || 0);
        const total_sold =
          parseFloat(purchase_stock || 0) - parseFloat(current_stock || 0);
        const movement_percent =
          purchase_stock > 0
            ? parseFloat(((total_sold / purchase_stock) * 100).toFixed(3))
            : 0;

        return {
          name: inv?.product?.name,
          batch: inv?.number,
          purchase_date: value?.purchase?.date,
          purchase_stock,
          current_stock,
          total_sold,
          movement_percent,
          days: Math.floor(
            (now - new Date(value?.purchase?.date)) / (1000 * 60 * 60 * 24)
          ),
        };
      })
      .filter(Boolean); // Remove nulls

    allProductAgeing.sort(
      (a, b) => parseFloat(a.total_sold) - parseFloat(b.total_sold)
    );

    if (sort == 0) {
      allProductAgeing.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort == 1) {
      allProductAgeing.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sort == 2) {
      allProductAgeing.sort((a, b) => parseFloat(a.days) - parseFloat(b.days));
    } else if (sort == 3) {
      allProductAgeing.sort((a, b) => parseFloat(b.days) - parseFloat(a.days));
    } else if (sort == 4) {
      allProductAgeing.sort(
        (a, b) => parseFloat(a.purchase_stock) - parseFloat(b.purchase_stock)
      );
    } else if (sort == 5) {
      allProductAgeing.sort(
        (a, b) => parseFloat(b.purchase_stock) - parseFloat(a.purchase_stock)
      );
    } else if (sort == 6) {
      allProductAgeing.sort(
        (a, b) => parseFloat(a.current_stock) - parseFloat(b.current_stock)
      );
    } else if (sort == 7) {
      allProductAgeing.sort(
        (a, b) => parseFloat(b.current_stock) - parseFloat(a.current_stock)
      );
    } else if (sort == 8) {
      allProductAgeing.sort(
        (a, b) => parseFloat(a.total_sold) - parseFloat(b.total_sold)
      );
    } else if (sort == 9) {
      allProductAgeing.sort(
        (a, b) => parseFloat(b.total_sold) - parseFloat(a.total_sold)
      );
    } else if (sort == 10) {
      allProductAgeing.sort(
        (a, b) =>
          parseFloat(a.movement_percent) - parseFloat(b.movement_percent)
      );
    } else if (sort == 11) {
      allProductAgeing.sort(
        (a, b) =>
          parseFloat(b.movement_percent) - parseFloat(a.movement_percent)
      );
    }

    success_200(res, "Batch-wise product ageing fetched", allProductAgeing);
  } catch (err) {
    catch_400(res, err.message);
  }
};

// const get_net_sales_reports = async (req, res) => {
//   try {
//     const authorize = authorization(req);
//     if (!authorize) return unauthorized(res);

//     const { branch, timezone, sort, date } = req.body;

//     const selected_branch =
//       branch === "ALL"
//         ? "ALL"
//         : new mongoose.Types.ObjectId(branch || authorize?.branch);

//     const matchConditions = {
//       ref: authorize.ref,
//       status: 1,
//     };

//     if (selected_branch !== "ALL") {
//       matchConditions.branch = selected_branch;
//     }

//     if (date?.start && date?.end) {
//       const start = moment.tz(date.start, timezone).startOf("day").toDate();
//       const end = moment.tz(date.end, timezone).endOf("day").toDate();
//       matchConditions.date = { $gte: start, $lte: end };
//       matchConditions.status = 1;
//     }

//     const allInvoice = await invoices
//       .find(matchConditions)
//       ?.populate("customer")
//       ?.populate("branch");

//     const allInvoiceReports = [];
//     for (value of allInvoice) {
//       const invoiceDetails = await invoices_details
//         ?.find({
//           invoice: value?._id,
//         })
//         ?.populate("description");

//       let allInvoiceDetails = [];
//       let grand_total_net_profit = 0;
//       for (v of invoiceDetails) {
//         let net_profit =
//           parseFloat(v?.sale_price || 0) - parseFloat(v?.price_per_unit || 0);

//         let total_net_profit =
//           parseFloat(net_profit || 0) * parseFloat(v?.quantity || 0);

//         grand_total_net_profit += total_net_profit;

//         allInvoiceDetails?.push({
//           ...v?.toObject(),
//           total_net_profit: parseFloat(total_net_profit || 0),
//         });
//       }

//       allInvoiceReports?.push({
//         ...value?.toObject(),
//         details: allInvoiceDetails,
//         grand_total_net_profit: grand_total_net_profit,
//       });
//     }

//     success_200(res, "", allInvoiceReports);
//   } catch (err) {
//     catch_400(res, err.message);
//   }
// };

const get_net_sales_reports = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) return unauthorized(res);

    const { branch, timezone, date } = req.body;

    const selected_branch =
      branch === "ALL"
        ? "ALL"
        : new mongoose.Types.ObjectId(branch || authorize?.branch);

    // Build match conditions for invoices
    const matchConditions = {
      ref: authorize.ref,
      status: 1,
    };

    if (selected_branch !== "ALL") {
      matchConditions.branch = selected_branch;
    }

    if (date?.start && date?.end) {
      const start = moment.tz(date.start, timezone).startOf("day").toDate();
      const end = moment.tz(date.end, timezone).endOf("day").toDate();
      matchConditions.date = { $gte: start, $lte: end };
    }

    // Fetch all invoices in one go
    const allInvoice = await invoices
      .find(matchConditions)
      .populate("customer")
      .populate("branch")
      .lean();

    const invoiceIds = allInvoice.map((inv) => inv._id);

    // Fetch all invoice details for those invoices at once
    const allDetails = await invoices_details
      .find({ invoice: { $in: invoiceIds } })
      .populate("description")
      .lean();

    // Group details by invoice ID
    const groupedDetails = {};
    for (let detail of allDetails) {
      const net_profit =
        parseFloat(detail.sale_price || 0) -
        parseFloat(detail.price_per_unit || 0);
      const total_net_profit = net_profit * parseFloat(detail.quantity || 0);

      const enrichedDetail = {
        ...detail,
        total_net_profit,
      };

      if (!groupedDetails[detail.invoice]) {
        groupedDetails[detail.invoice] = [];
      }
      groupedDetails[detail.invoice].push(enrichedDetail);
    }

    // Combine invoice and detail data
    const allInvoiceReports = allInvoice.map((inv) => {
      const details = groupedDetails[inv._id] || [];
      const grand_total_net_profit = details.reduce(
        (acc, cur) => acc + (cur.total_net_profit || 0),
        0
      );

      return {
        ...inv,
        details,
        grand_total_net_profit,
      };
    });

    return success_200(res, "", allInvoiceReports);
  } catch (err) {
    return catch_400(res, err.message);
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
  get_sales_return_reports,
  get_purchase_return_reports,
  get_fast_moving_products_reports,
  get_net_sales_reports,
  get_products_ageing_reports,
  get_products_received_ageing_reports,
};
