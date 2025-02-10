const { authorization } = require("../Global/authorization");
const {
  failed_400,
  unauthorized,
  catch_400,
  incomplete_400,
  success_200,
} = require("../Global/errors");
const expense_categories = require("../Models/expense_categories");
const expense_categories_log = require("../Models/expense_categories_log");

const create_expense_category = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { name, status, branch } = req?.body;

      if (!name) {
        incomplete_400(res);
      } else {
        const selected_expense_category_name =
          await expense_categories?.findOne({
            name: name,
            branch: authorize?.branch,
          });

        if (selected_expense_category_name) {
          failed_400(res, "Category name exists");
        } else {
          const expense_category = new expense_categories({
            name: name,
            status: status ? status : 0,
            ref: authorize?.ref,
            branch: branch ? branch : authorize?.branch,
            created: new Date(),
            created_by: authorize?.id,
          });

          const expense_category_save = await expense_category?.save();
          success_200(res, "Category created");
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

    const { id, name, status, branch } = req?.body;

    if (!id || !name) {
      incomplete_400(res);
    } else {
      const selected_expense_category = await expense_categories?.findById(id);

      if (!selected_expense_category || selected_expense_category.status == 2) {
        failed_400(res, "Category not found");
      } else {
        const selected_expense_category_name =
          await expense_categories?.findOne({
            _id: { $ne: id },
            name: name,
            branch: branch ? branch : authorize?.branch,
          });

        if (selected_expense_category_name) {
          failed_400(res, "Category name exists");
        } else {
          const expense_category_log = new expense_categories_log({
            category: selected_expense_category?._id,
            name: selected_expense_category?.name,
            status: selected_expense_category?.status,
            ref: selected_expense_category?.ref,
            branch: selected_expense_category?.branch,
            updated: new Date(),
            updated_by: authorize?.id,
          });
          const employee_log_save = await expense_category_log?.save();

          selected_expense_category.name = name;
          selected_expense_category.status = status ? status : 0;

          const expense_category_update = selected_expense_category?.save();
          success_200(res, "Category updated");
        }
      }
    }

    if (authorize) {
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const delete_expense_category = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_expense_category = await expense_categories?.findById(
          id
        );

        if (
          !selected_expense_category ||
          selected_expense_category.status == 2
        ) {
          failed_400(res, "Category not found");
        } else {
          const expense_category_log = new expense_categories_log({
            category: selected_expense_category?._id,
            name: selected_expense_category?.name,
            status: selected_expense_category?.status,
            ref: selected_expense_category?.ref,
            branch: selected_expense_category?.branch,
            updated: new Date(),
            updated_by: authorize?.id,
          });
          const employee_log_save = await expense_category_log?.save();

          selected_expense_category.status = 2;
          const expense_category_delete = selected_expense_category?.save();
          success_200(res, "Category deleted");
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
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_expense_categories = await expense_categories?.findById(
          id
        );

        if (
          !selected_expense_categories ||
          selected_expense_categories.status == 2
        ) {
          failed_400(res, "Category not found");
        } else {
          success_200(res, "", selected_expense_categories);
        }
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

    if (!authorize) {
      return unauthorized(res);
    }

    const { search, status, sort, page, limit } = req?.body;

    const page_number = Number(page) || 1;
    const page_limit = Number(limit) || 10;

    const expenseCategoryList = {
      branch: authorize?.branch,
      status: { $ne: 2 },
    };

    if (search) {
      expenseCategoryList.name = { $regex: search, $options: "i" };
    }
    if (status == 0 || status) {
      expenseCategoryList.status = status;
    }

    // Set sorting options
    let sortOption = { name: 1 }; // Default sorting by name (ascending)
    if (sort == 0) {
      sortOption = { name: 1 };
    } else if (sort == 1) {
      sortOption = { name: -1 };
    }

    // Get total count for pagination metadata
    const totalCount = await expense_categories.countDocuments(
      expenseCategoryList
    );

    // Fetch paginated data
    const paginated_expense_categories = await expense_categories
      .find(expenseCategoryList)
      .sort(sortOption)
      .skip((page_number - 1) * page_limit)
      .limit(page_limit);

    const totalPages = Math.ceil(totalCount / page_limit);

    success_200(res, "", {
      currentPage: page_number,
      totalPages,
      totalCount,
      data: paginated_expense_categories,
    });
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_expense_category_log = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_expense_category_log =
          await expense_categories_log?.findById(id);

        if (!selected_expense_category_log) {
          failed_400(res, "Category log not found");
        } else {
          success_200(res, "", selected_expense_category_log);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_expense_categories_log = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { category } = req?.body;

      if (!item) {
        incomplete_400(res);
      } else {
        const all_expense_categories_log = await expense_categories_log?.find({
          category: category,
        });
        success_200(res, "", all_expense_categories_log);
      }
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
  delete_expense_category,
  get_expense_category,
  get_all_expense_categories,
  get_expense_category_log,
  get_all_expense_categories_log,
};
