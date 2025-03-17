const { authorization } = require("../Global/authorization");
const {
  failed_400,
  unauthorized,
  catch_400,
  incomplete_400,
  success_200,
} = require("../Global/errors");
const expenses = require("../Models/expenses");
const expenses_log = require("../Models/expenses_log");
const { checknull } = require("../Global/checknull");

const get_next_expense = async (req, res, number) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const total_expense = await expenses.countDocuments({
        branch: authorize?.branch,
      });

      const next_expense_number = number + total_expense;

      const existing_expense_number = await expenses.findOne({
        number: next_expense_number,
        branch: authorize?.branch,
      });

      if (existing_expense_number) {
        return await get_next_expense(req, res, next_expense_number);
      } else {
        return next_expense_number;
      }
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
        number,
        date,
        category,
        description,
        payment,
        amount,
        status,
        branch,
      } = req?.body;

      let new_number = await get_next_expense(req, res, 1000);
      let assigned_number = number ? number : new_number;

      if (!assigned_number || !date || !category || !payment || !amount) {
        incomplete_400(res);
      } else {
        const expense = new expenses({
          number: assigned_number,
          date: date,
          category: checknull(category),
          description: description,
          payment: payment,
          amount: amount,
          status: status ? status : 0,
          ref: authorize?.ref,
          branch: branch ? branch : authorize?.branch,
          created: new Date(),
          created_by: authorize?.id,
        });

        const expense_save = await expense?.save();
        success_200(res, "Expense created");
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
        number,
        date,
        category,
        description,
        payment,
        amount,
        status,
        branch,
      } = req?.body;

      let new_number = await get_next_expense(req, res, 1000);
      let assigned_number = number ? number : new_number;

      if (
        !id ||
        !assigned_number ||
        !date ||
        !category ||
        !payment ||
        !amount
      ) {
        incomplete_400(res);
      } else {
        const selected_expense = await expenses?.findById(id);

        if (!selected_expense || selected_expense?.status == 2) {
          failed_400(res, "Expense not found");
        } else {
          const selected_expense_number = await expenses?.findOne({
            _id: { $ne: id },
            number: number,
            branch: authorize?.branch,
          });

          if (selected_expense_number) {
            failed_400(res, "Expense number exists");
          } else {
            const expense_log = new expenses_log({
              number: selected_expense?.number,
              date: selected_expense?.date,
              category: selected_expense?.category,
              description: selected_expense?.description,
              payment: selected_expense?.amount,
              amount: selected_expense?.amount,
              status: selected_expense?.status,
              ref: selected_expense?.ref,
              branch: selected_expense?.branch,
              updated: new Date(),
              updated_by: authorize?.id,
            });

            const expense_log_save = await expense_log?.save();

            selected_expense.number = assigned_number;
            selected_expense.date = date;
            selected_expense.category = category;
            selected_expense.description = description;
            selected_expense.payment = payment;
            selected_expense.amount = amount;
            selected_expense.status = status ? status : 0;
            selected_expense.branch = branch ? branch : authorize?.branch;

            const expense_save = await selected_expense?.save();
            success_200(res, "Expense updated");
          }
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const delete_expense = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_expense = await expenses?.findById(id);

        if (!selected_expense || selected_expense?.status == 2) {
          failed_400(res, "Expense not found");
        } else {
          const expense_log = new expenses_log({
            number: selected_expense?.number,
            date: selected_expense?.date,
            category: selected_expense?.category,
            description: selected_expense?.description,
            amount: selected_expense?.amount,
            status: selected_expense?.status,
            ref: selected_expense?.ref,
            branch: selected_expense?.branch,
            updated: new Date(),
            updated_by: authorize?.id,
          });

          const expense_log_save = await expense_log?.save();

          selected_expense.status = 2;
          const delete_expense = await selected_expense?.save();

          success_200(res, "Expense deleted");
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
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_expense = await expenses
          ?.findById(id)
          ?.populate({ path: "category", match: { status: 1 } });

        if (!selected_expense || selected_expense?.status == 2) {
          failed_400(res, "Expense not found");
        } else {
          success_200(res, "", selected_expense);
        }
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

    if (!authorize) {
      return unauthorized(res);
    }

    const { search, category, status, sort, date, page, limit } = req?.body;

    const page_number = Number(page) || 1;
    const page_limit = Number(limit) || 10;

    const expensesList = { branch: authorize?.branch, status: { $ne: 2 } };

    if (search) {
      expensesList.number = { $regex: search, $options: "i" };
    }
    if (category) {
      expensesList.category = category;
    }
    if (status) {
      expensesList.status = status;
    }
    if (status == 0) {
      expensesList.status = status;
    }

    if (date?.start && date?.end) {
      let startDate = new Date(date.start);
      startDate.setHours(0, 0, 0, 0);

      let endDate = new Date(date.end);
      endDate.setHours(23, 59, 59, 999);

      expensesList.date = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    let sortOption = { date: 1 };
    if (sort == 1) {
      sortOption = { amount: 1 };
    } else if (sort == 2) {
      sortOption = { amount: -1 };
    }

    // Get total count for pagination metadata
    const totalCount = await expenses.countDocuments(expensesList);

    // Fetch paginated data
    const paginated_expenses = await expenses
      .find(expensesList)
      .populate({ path: "category", match: { status: 1 } })
      .sort(sortOption)
      .skip((page_number - 1) * page_limit)
      .limit(page_limit);

    const totalPages = Math.ceil(totalCount / page_limit);

    success_200(res, "", {
      currentPage: page_number,
      totalPages,
      totalCount,
      data: paginated_expenses,
    });
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_expense_log = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_expense_log = await expenses_log?.findById(id);

        if (!selected_expense_log) {
          failed_400(res, "Expense not found");
        } else {
          success_200(res, "", selected_expense_log);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_expenses_log = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { expense } = req?.body;

      if (!item) {
        incomplete_400(res);
      } else {
        const all_expense_log = await expenses_log?.find({
          expense: expense,
        });
        success_200(res, "", all_expense_log);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_expense,
  update_expense,
  delete_expense,
  get_expense,
  get_all_expenses,
  get_expense_log,
  get_all_expenses_log,
};
