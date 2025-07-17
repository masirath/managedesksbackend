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
const references = require("./Routes/references");
const lpos = require("./Routes/lpos");
const accountRoutes = require("./Routes/account");
const manualJournals = require("./Routes/manualJournals");
const recurringEntry = require("./Routes/recurringEntry");
const entryTemplate = require("./Routes/entryTemplate");
const approvalWorkflow = require("./Routes/approvalWorkflow");
const generalLedgerRoutes = require("./Routes/generalLedger");
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

const Environment = environment();

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
});

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: "50mb" }));
app.use("/uploads", express.static("uploads"));

app.use(users);
app.use(product_units);
app.use(product_brands);
app.use(product_categories);
app.use(products);
app.use(customers);
app.use(references);
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
app.use(lpos);

app.use(accountRoutes);
app.use(manualJournals);

app.use(recurringEntry);
app.use(entryTemplate);
app.use(approvalWorkflow);
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
});
