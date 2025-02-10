require("dotenv").config();
const { authorization } = require("../Global/authorization");
const {
  failed_400,
  unauthorized,
  catch_400,
  incomplete_400,
  success_200,
} = require("../Global/errors");
const product_units = require("../Models/product_units");
const product_units_log = require("../Models/product_units_log");

const create_product_unit = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { name, status, branch } = req?.body;

      if (!name) {
        incomplete_400(res);
      } else {
        const selected_product_unit_name = await product_units?.findOne({
          name: name,
          branch: authorize?.branch,
        });

        if (selected_product_unit_name) {
          failed_400(res, "Unit name exists");
        } else {
          const product_unit = new product_units({
            name: name,
            status: status ? status : 0,
            ref: authorize?.ref,
            branch: branch ? branch : authorize?.branch,
            created: new Date(),
            created_by: authorize?.id,
          });

          const product_unit_save = await product_unit?.save();
          success_200(res, "Unit created");
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const update_product_unit = async (req, res) => {
  try {
    const authorize = authorization(req);

    const { id, name, status, branch } = req?.body;

    if (!id || !name) {
      incomplete_400(res);
    } else {
      const selected_product_unit = await product_units?.findById(id);

      if (!selected_product_unit || selected_product_unit.status == 2) {
        failed_400(res, "Unit not found");
      } else {
        const selected_product_unit_name = await product_units?.findOne({
          _id: { $ne: id },
          name: name,
          branch: branch ? branch : authorize?.branch,
        });

        if (selected_product_unit_name) {
          failed_400(res, "Unit name exists");
        } else {
          const product_unit_log = new product_units_log({
            unit: selected_product_unit?._id,
            name: selected_product_unit?.name,
            status: selected_product_unit?.status,
            ref: selected_product_unit?.ref,
            branch: selected_product_unit?.branch,
            updated: new Date(),
            updated_by: authorize?.id,
          });

          const product_unit_log_save = await product_unit_log?.save();

          selected_product_unit.name = name;
          selected_product_unit.status = status ? status : 0;
          selected_product_unit.branch = branch ? branch : authorize?.branch;

          const product_unit_update = selected_product_unit?.save();
          success_200(res, "Unit updated");
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

const delete_product_unit = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id, status } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_product_unit = await product_units?.findById(id);

        if (!selected_product_unit) {
          failed_400(res, "Unit not found");
        } else {
          const product_unit_log = new product_units_log({
            unit: selected_product_unit?.id,
            name: selected_product_unit?.name,
            status: selected_product_unit?.status,
            ref: selected_product_unit?.ref,
            branch: selected_product_unit?.branch,
            updated: new Date(),
            updated_by: authorize?.id,
          });

          const product_unit_log_save = await product_unit_log?.save();

          selected_product_unit.status = 2;
          const product_unit_delete = selected_product_unit?.save();
          success_200(res, "Unit deleted");
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_product_unit = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_product_units = await product_units?.findById(id);

        if (!selected_product_units) {
          failed_400(res, "Units not found");
        } else {
          success_200(res, "", selected_product_units);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_product_units = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (!authorize) {
      return unauthorized(res);
    }

    const { search, status, sort, page, limit } = req?.body;

    const page_number = Number(page) || 1;
    const page_limit = Number(limit) || 10;

    const productUnitList = { branch: authorize?.branch, status: { $ne: 2 } };

    if (search) {
      productUnitList.name = { $regex: search, $options: "i" };
    }
    if (status == 0 || status) {
      productUnitList.status = status;
    }

    // Set sorting options
    let sortOption = { created: -1 }; // Default sorting
    if (sort == 0) {
      sortOption = { name: 1 }; // Sort by name ascending
    } else if (sort == 1) {
      sortOption = { name: -1 }; // Sort by name descending
    }

    // Get total count for pagination metadata
    const totalCount = await product_units.countDocuments(productUnitList);

    // Fetch paginated data
    const paginated_product_units = await product_units
      .find(productUnitList)
      .sort(sortOption)
      .skip((page_number - 1) * page_limit)
      .limit(page_limit);

    const totalPages = Math.ceil(totalCount / page_limit);

    success_200(res, "", {
      currentPage: page_number,
      totalPages,
      totalCount,
      data: paginated_product_units,
    });
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_product_unit_log = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_product_unit_log = await product_units_log?.findById(id);

        if (!selected_product_unit_log) {
          failed_400(res, "Unit log not found");
        } else {
          success_200(res, "", selected_product_unit_log);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_product_unit_logs = async (req, res) => {
  try {
    const authorize = authorization(req);

    const { search } = req?.body;

    if (authorize) {
      const { unit } = req?.body;

      if (!unit) {
        incomplete_400(res);
      } else {
        const all_product_unit_logs = await product_units_log?.find({
          unit: unit,
        });
        success_200(res, "", all_product_unit_logs);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_product_unit,
  update_product_unit,
  delete_product_unit,
  get_product_unit,
  get_all_product_units,
  get_product_unit_log,
  get_all_product_unit_logs,
};
