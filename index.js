require("dotenv").config();
const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
const users = require("./Routes/users");
const product_units = require("./Routes/product_units");
const product_brands = require("./Routes/product_brands");
const product_categories = require("./Routes/product_categories");
const products = require("./Routes/products");
const customers = require("./Routes/customers");
const suppliers = require("./Routes/suppliers");
const expenses = require("./Routes/expenses");
const expense_categories = require("./Routes/expense_categories");
const inventories = require("./Routes/invetories");
const purchase_orders = require("./Routes/purchase_orders");
const invoices = require("./Routes/invoices");
const { environment } = require("./Global/environment");
const branches = require("./Routes/branches");
const dashboard = require("./Routes/dashboard");
const sales_returns = require("./Routes/sales_returns");
const purchases_returns = require("./Routes/purchases_returns");
const roles = require("./Routes/roles");
const requests = require("./Routes/requests");
const transfers = require("./Routes/transfers");
const received = require("./Routes/received");
const quotes = require("./Routes/quotes");
const accountRoutes = require("./Routes/account");
const manualJournals = require("./Routes/manualJournals");
const recurringEntry = require("./Routes/recurringEntry");
const entryTemplate = require("./Routes/entryTemplate");
const approvalWorkflow = require("./Routes/approvalWorkflow");
const generalLedgerRoutes = require("./Routes/generalLedger");
const Environment = environment();
const uploadRoutes = require("./Routes/uploads");
const balanceSheetRoutes = require("./Routes/balanceSheetRoutes");
const ProfitLossRoutes = require("./Routes/ProfitLossRoutes");
const TrialBalanceRoutes = require("./Routes/trialBalanceRoutes");
const generalLedgerSummary = require("./Routes/generalledgerSummary");
const PurchaseVoucherRoutes = require("./Routes/PurchaseVoucherRoutes");
const ReceiptNotesRoutes = require("./Routes/ReceiptNotesRoutes");
const PurchaseOrdersRoutes = require("./Routes/PurchaseOrdersRoutes");
const GrnRoutes = require("./Routes/GrnRoutes");
const delivery_notes = require("./Routes/delivery_notes");
const path = require("path");
const lpos = require("./Routes/lpos");

const PORT =
  Environment === "PRODUCTION"
    ? process.env.PRODUCTION_PORT
    : Environment === "TESTING"
    ? process.env.TESTING_PORT
    : Environment === "DEVELOPMENT"
    ? process.env.DEVELOPMENT_PORT
    : Environment === "LOCAL"
    ? process.env.LOCAL_PORT
    : "";

const DATABASE =
  Environment === "PRODUCTION"
    ? process.env.PRODUCTION_DATABASE
    : Environment === "TESTING"
    ? process.env.TESTING_DATABASE
    : Environment === "DEVELOPMENT"
    ? process.env.DEVELOPMENT_DATABASE
    : Environment === "LOCAL"
    ? process.env.LOCAL_DATABASE
    : "";

mongoose.connect(DATABASE);
const database = mongoose.connection;
database.on("error", (error) => {
  console.log(error);
});
database.once("connected", () => {
  console.log("Database Connected");

  // Create uploads directory if it doesn't exist
  const fs = require("fs");
  const uploadDir = path.join(__dirname, "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log("Uploads directory created");
  }
});

const app = express();
const allRoutes = {
  users,
  product_units,
  product_brands,
  product_categories,
  products,
  customers,
  suppliers,
  expenses,
  expense_categories,
  inventories,
  purchase_orders,
  invoices,
  branches,
  dashboard,
  sales_returns,
  purchases_returns,
  roles,
  requests,
  transfers,
  received,
  quotes,
  accountRoutes,
  manualJournals,
  recurringEntry,
  entryTemplate,
  approvalWorkflow,
  generalLedgerRoutes,
  uploadRoutes,
  balanceSheetRoutes,
  ProfitLossRoutes,
  TrialBalanceRoutes,
  generalLedgerSummary,
  PurchaseVoucherRoutes,
  ReceiptNotesRoutes,
  PurchaseOrdersRoutes,
  GrnRoutes,
  delivery_notes,
};

for (const [name, route] of Object.entries(allRoutes)) {
  if (typeof route !== "function" || !route.stack) {
    // console.error(`❌ ${name} is NOT a valid Express router`);
  } else {
    // console.log(`✅ ${name} loaded`);
  }
}

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(users);
app.use(product_units);
app.use(product_brands);
app.use(product_categories);
app.use(products);
app.use(customers);
app.use(suppliers);
app.use(expenses);
app.use(expense_categories);
app.use(inventories);
app.use(purchase_orders);
app.use(purchases_returns);
app.use(invoices);
app.use(sales_returns);
app.use(branches);
app.use(dashboard);
app.use(roles);
app.use(requests);
app.use(transfers);
app.use(received);
app.use(quotes);
app.use(lpos);

//testing chart of account route
app.use(accountRoutes);
//testing for manual journals
app.use(manualJournals);

app.use(recurringEntry);
app.use(entryTemplate);
app.use(approvalWorkflow);
// app.use("/api/ledger", generalLedgerRoutes);
app.use("/api", generalLedgerRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api", balanceSheetRoutes);
app.use("/api", ProfitLossRoutes);
app.use("/api", TrialBalanceRoutes);
app.use("/ledger-summary", generalLedgerSummary);
app.use("/purchase-voucher", PurchaseVoucherRoutes);
app.use("/api", ReceiptNotesRoutes);
app.use("/api", PurchaseOrdersRoutes);
app.use("/api/grn", GrnRoutes);
app.use(delivery_notes);

app.listen(PORT, () => {
  console.log(`Server started at ${PORT}`);
  // console.log(`Uploads directory: ${path.join(__dirname, "uploads")}`);
});
