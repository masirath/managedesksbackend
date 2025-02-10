const express = require("express");
const {
  create_expense,
  get_expense,
  get_all_expenses,
  update_expense,
  get_all_expenses_log,
  get_expense_log,
  delete_expense,
} = require("../Controllers/expenses");
const expenses = express.Router();

expenses?.post("/api/create-expense", create_expense);
expenses?.post("/api/update-expense", update_expense);
expenses?.post("/api/delete-expense", delete_expense);
expenses?.post("/api/get-expense", get_expense);
expenses?.post("/api/get-all-expenses", get_all_expenses);
expenses?.post("/api/get-expense-log", get_expense_log);
expenses?.post("/api/get-all-expenses-log", get_all_expenses_log);

module.exports = expenses;
