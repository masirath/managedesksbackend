const {
  catch_400,
  incomplete_400,
  error_400,
  unauthorized,
  success_200,
  failed_400,
} = require("../Global/errors");
const { authorization } = require("../Global/authorization");
const expenses = require("../Models/expenses");
const expense_categories = require("../Models/expense_categories");
const users = require("../Models/users");

const create_expense_category = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const { name, status, branch } = req?.body;

      if (!name) {
        incomplete_400(res);
      } else {
        const existing_category = await expense_categories.findOne({
          name: name,
          branch: authorize?.branch,
        });

        if (existing_category) {
          failed_400(res, "Expense category exist");
        } else {
          const category = new expense_categories({
            name: name,
            status: status ? status : 0,
            ref: authorize?.ref,
            branch: branch ? branch : authorize?.branch,
            created: new Date(),
            updated: new Date(),
            created_by: authorize?.id,
            updated_by: authorize?.id,
          });

          const categoryToSave = await category?.save();
          success_200(res, "Expense category created", categoryToSave);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const update_expense_category = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const { id, name, status, branch } = req?.body;

      if (!id || !name) {
        incomplete_400(res);
      } else {
        const category = await expense_categories?.findById(id);

        if (category) {
          const existing_category = await expense_categories.findOne({
            _id: { $ne: id },
            name: name,
            branch: authorize?.branch,
          });

          if (existing_category) {
            failed_400(res, "Expense category exist");
          } else {
            category.name = name;
            category.status = status ? status : 0;
            category.ref = authorize?.ref;
            category.branch = branch ? branch : authorize?.branch;
            category.created = new Date();
            category.updated = new Date();
            category.created_by = authorize?.id;
            category.updated_by = authorize?.id;

            const categoryToUpdate = await category?.save();
            success_200(res, "Expense category updated", categoryToUpdate);
          }
        } else {
          failed_400(res, "Expense category not found");
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_expense_category = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const { id } = req?.params;

      const category = await expense_categories?.findById(id);
      if (!category) {
        failed_400(res, "Expense category not found");
      } else {
        success_200(res, "", category);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_expense_categories = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const { search } = req?.body;

      const categoryList = { branch: authorize?.branch };
      search && (categoryList.name = { $regex: search, $options: "i" });

      const allCategory = await expense_categories?.find(categoryList);

      success_200(res, "", allCategory);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_create_expense = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const allCategories = await expense_categories?.find({
        branch: authorize?.branch,
      });
      const allUsers = await users
        ?.find({
          branch: authorize?.branch,
          role: { $ne: "SUPERADMIN" },
        })
        .select("-password");

      const data = {
        categories: allCategories,
        users: allUsers,
      };
      success_200(res, "", data);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const create_expense = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const {
        expenses_category,
        amount,
        reference,
        date,
        description,
        file,
        status,
        branch,
      } = req?.body;

      if (!expenses_category || !amount || !reference || !date) {
        incomplete_400(res);
      } else {
        const expense = new expenses({
          expenses_category: expenses_category,
          amount: amount ? amount : 0,
          reference: reference,
          date: date,
          description: description,
          file: file ? file : "",
          status: status ? status : 0,
          ref: authorize?.ref,
          branch: branch ? branch : authorize?.branch,
          created: new Date(),
          updated: new Date(),
          created_by: authorize?.id,
          updated_by: authorize?.id,
        });

        const expenseToSave = await expense?.save();

        success_200(res, "Expense created", expenseToSave);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const update_expense = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const {
        id,
        expenses_category,
        amount,
        reference,
        date,
        description,
        file,
        status,
        branch,
      } = req?.body;

      if (!id || !expenses_category || !amount || !reference || !date) {
        incomplete_400(res);
      } else {
        const expense = await expenses?.findById(id);

        if (expense) {
          expense.expenses_category = expenses_category
            ? expenses_category
            : "";
          expense.amount = amount ? amount : 0;
          expense.reference = reference ? reference : "";
          expense.date = date ? date : "";
          expense.description = description ? description : "";
          expense.file = file ? file : "";
          expense.status = status ? status : 0;
          (expense.ref = authorize?.ref),
            (expense.branch = branch ? branch : authorize?.branch);
          expense.updated = new Date();
          expense.updated_by = authorize?.id;

          const expenseToUpdate = await expense?.save();

          success_200(res, "Expense updated", expenseToUpdate);
        } else {
          failed_400(res, "Expense not found");
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_expense = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const { id } = req?.params;

      const expense = await expenses
        ?.findById(id)
        .populate({ path: "expenses_category", select: ["name"] })
        .populate({ path: "reference", select: ["first_name", "last_name"] });
      const allCategories = await expense_categories?.find({
        branch: authorize?.branch,
      });
      const allUsers = await users
        ?.find({
          branch: authorize?.branch,
          role: { $ne: "SUPERADMIN" },
        })
        .select("-password");

      if (!expense) {
        failed_400(res, "Expense not found");
      } else {
        const data = {
          expense: expense,
          categories: allCategories,
          users: allUsers,
        };
        success_200(res, "", data);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_expenses = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const { search } = req?.body;

      const expencesList = { branch: authorize?.branch };
      search && (expencesList.name = { $regex: search, $options: "i" });

      const allExpenses = await expenses
        ?.find(expencesList)
        .populate({ path: "reference", select: ["first_name", "last_name"] })
        .populate({ path: "expenses_category", select: ["name"] });
      success_200(res, "", allExpenses);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_expense_category,
  update_expense_category,
  get_expense_category,
  get_all_expense_categories,
  get_create_expense,
  create_expense,
  update_expense,
  get_expense,
  get_all_expenses,
};
