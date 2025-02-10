require("dotenv").config();
const { authorization } = require("../Global/authorization");
const {
  failed_400,
  unauthorized,
  catch_400,
  incomplete_400,
  success_200,
} = require("../Global/errors");
const product_categories = require("../Models/product_categories");
const product_categories_log = require("../Models/product_categories_log");

const create_product_category = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { name, status, branch } = req?.body;

      if (!name) {
        incomplete_400(res);
      } else {
        const selected_product_category_name =
          await product_categories?.findOne({
            name: name,
            branch: authorize?.branch,
          });

        if (selected_product_category_name) {
          failed_400(res, "Category name exists");
        } else {
          const product_category = new product_categories({
            name: name,
            status: status ? status : 0,
            ref: authorize?.ref,
            branch: branch ? branch : authorize?.branch,
            created: new Date(),
            created_by: authorize?.id,
          });

          const product_category_save = await product_category?.save();
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

const update_product_category = async (req, res) => {
  try {
    const authorize = authorization(req);

    const { id, name, status, branch } = req?.body;

    if (!id || !name) {
      incomplete_400(res);
    } else {
      const selected_product_category = await product_categories?.findById(id);

      if (!selected_product_category || selected_product_category.status == 2) {
        failed_400(res, "Category not found");
      } else {
        const selected_product_category_name =
          await product_categories?.findOne({
            _id: { $ne: id },
            name: name,
            branch: branch ? branch : authorize?.branch,
          });

        if (selected_product_category_name) {
          failed_400(res, "Category name exists");
        } else {
          const product_category_log = new product_categories_log({
            category: selected_product_category?._id,
            name: selected_product_category?.name,
            status: selected_product_category?.status,
            ref: selected_product_category?.ref,
            branch: selected_product_category?.branch,
            updated: new Date(),
            updated_by: authorize?.id,
          });

          const product_category_log_save = await product_category_log?.save();

          selected_product_category.name = name;
          selected_product_category.status = status ? status : 0;
          selected_product_category.branch = branch
            ? branch
            : authorize?.branch;

          const product_category_update = selected_product_category?.save();
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

const delete_product_category = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_product_category = await product_categories?.findById(
          id
        );

        if (!selected_product_category) {
          failed_400(res, "Category not found");
        } else {
          const product_category_log = new product_categories_log({
            category: selected_product_category?._id,
            name: selected_product_category?.name,
            status: selected_product_category?.status,
            ref: selected_product_category?.ref,
            branch: selected_product_category?.branch,
            updated: new Date(),
            updated_by: authorize?.id,
          });

          const product_category_log_save = await product_category_log?.save();

          selected_product_category.status = 2;
          const product_category_delete = selected_product_category?.save();
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

const get_product_category = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_product_category = await product_categories?.findById(
          id
        );

        if (!selected_product_category) {
          failed_400(res, "Category not found");
        } else {
          success_200(res, "", selected_product_category);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_product_categories = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (!authorize) {
      return unauthorized(res);
    }

    const { search, status, sort, page, limit } = req?.body;

    const page_number = Number(page) || 1;
    const page_limit = Number(limit) || 10;

    const productCategoryList = {
      branch: authorize?.branch,
      status: { $ne: 2 },
    };

    if (search) {
      productCategoryList.name = { $regex: search, $options: "i" };
    }
    if (status == 0 || status) {
      productCategoryList.status = status;
    }

    // Set sorting options
    let sortOption = { created: -1 }; // Default sorting
    if (sort == 0) {
      sortOption = { name: 1 }; // Sort by name ascending
    } else if (sort == 1) {
      sortOption = { name: -1 }; // Sort by name descending
    }

    // Get total count for pagination metadata
    const totalCount = await product_categories.countDocuments(
      productCategoryList
    );

    // Fetch paginated data
    const paginated_product_categories = await product_categories
      .find(productCategoryList)
      .sort(sortOption)
      .skip((page_number - 1) * page_limit)
      .limit(page_limit);

    const totalPages = Math.ceil(totalCount / page_limit);

    success_200(res, "", {
      currentPage: page_number,
      totalPages,
      totalCount,
      data: paginated_product_categories,
    });
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_product_category_log = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_product_category_log =
          await product_categories_log?.findById(id);

        if (!selected_product_category_log) {
          failed_400(res, "Category log not found");
        } else {
          success_200(res, "", selected_product_category_log);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_product_category_logs = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { category } = req?.body;

      if (!category) {
        incomplete_400(res);
      } else {
        const all_product_category_logs = await product_categories_log?.find({
          category: category,
        });
        success_200(res, "", all_product_category_logs);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_product_category,
  update_product_category,
  delete_product_category,
  get_product_category,
  get_all_product_categories,
  get_product_category_log,
  get_all_product_category_logs,
};
