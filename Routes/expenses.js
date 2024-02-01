const express = require("express");
const expenses = express.Router();

const {
  create_expense_category,
  update_expense_category,
  get_expense_category,
  get_all_expense_categories,
  create_expense,
  update_expense,
  get_expense,
  get_all_expenses,
} = require("../Controllers/expenses");

expenses.post("/api/create-expense-category", create_expense_category);
expenses.post("/api/update-expense-category", update_expense_category);
expenses.get("/api/get-expense-category/:id", get_expense_category);
expenses.get("/api/get-all-expense-categories", get_all_expense_categories);
expenses.post("/api/create-expense", create_expense);
expenses.post("/api/update-expense", update_expense);
expenses.get("/api/get-expense/:id", get_expense);
expenses.get("/api/get-all-expenses", get_all_expenses);

module.exports = expenses;
