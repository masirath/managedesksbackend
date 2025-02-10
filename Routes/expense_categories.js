const express = require("express");
const {
  create_expense_category,
  update_expense_category,
  get_expense_category,
  get_all_expense_categories,
  get_expense_category_log,
  get_all_expense_categories_log,
  delete_expense_category,
} = require("../Controllers/expense_categories");
const expense_categories = express.Router();

expense_categories.post(
  "/api/create-expense-category",
  create_expense_category
);
expense_categories.post(
  "/api/update-expense-category",
  update_expense_category
);
expense_categories.post(
  "/api/delete-expense-category",
  delete_expense_category
);
expense_categories.post("/api/get-expense-category", get_expense_category);
expense_categories.post(
  "/api/get-all-expense-categories",
  get_all_expense_categories
);
expense_categories.post(
  "/api/get-expense-category-log",
  get_expense_category_log
);
expense_categories.post(
  "/api/get-all-expense-categories-log",
  get_all_expense_categories_log
);

module.exports = expense_categories;
