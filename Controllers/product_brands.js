require("dotenv").config();
const { authorization } = require("../Global/authorization");
const {
  failed_400,
  unauthorized,
  catch_400,
  incomplete_400,
  success_200,
} = require("../Global/errors");
const product_brands = require("../Models/product_brands");
const product_brands_log = require("../Models/product_brands_log");

const create_product_brand = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { name, status, branch } = req?.body;

      if (!name) {
        incomplete_400(res);
      } else {
        const selected_product_brand_name = await product_brands?.findOne({
          name: name,
          branch: branch ? branch : authorize?.branch,
        });

        if (selected_product_brand_name) {
          failed_400(res, "Brand name exists");
        } else {
          const product_brand = new product_brands({
            name: name,
            status: status ? status : 0,
            ref: authorize?.ref,
            branch: branch ? branch : authorize?.branch,
            created: new Date(),
            created_by: authorize?.id,
          });

          const product_brand_save = await product_brand?.save();
          success_200(res, "Brand created");
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const update_product_brand = async (req, res) => {
  try {
    const authorize = authorization(req);

    const { id, name, status, branch } = req?.body;

    if (!id || !name) {
      incomplete_400(res);
    } else {
      const selected_product_brand = await product_brands?.findById(id);

      if (!selected_product_brand || selected_product_brand.status == 2) {
        failed_400(res, "Brand not found");
      } else {
        const selected_product_brand_name = await product_brands?.findOne({
          _id: { $ne: id },
          name: name,
          branch: branch ? branch : authorize?.branch,
        });

        if (selected_product_brand_name) {
          failed_400(res, "Brand name exists");
        } else {
          const product_brand_log = new product_brands_log({
            brand: selected_product_brand?.id,
            name: selected_product_brand?.name,
            status: selected_product_brand?.status,
            ref: selected_product_brand?.ref,
            branch: selected_product_brand?.branch,
            updated: new Date(),
            updated_by: authorize?.id,
          });

          const product_brand_log_save = await product_brand_log?.save();

          selected_product_brand.name = name;
          selected_product_brand.status = status ? status : 0;
          selected_product_brand.branch = branch ? branch : authorize?.branch;

          const product_brand_update = selected_product_brand?.save();
          success_200(res, "Brand updated");
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

const delete_product_brand = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_product_brand = await product_brands?.findById(id);

        if (!selected_product_brand) {
          failed_400(res, "Brand not found");
        } else {
          const product_brand_log = new product_brands_log({
            brand: selected_product_brand?._id,
            name: selected_product_brand?.name,
            status: selected_product_brand?.status,
            ref: selected_product_brand?.ref,
            branch: selected_product_brand?.branch,
            updated: new Date(),
            updated_by: authorize?.id,
          });

          const product_brand_log_save = await product_brand_log?.save();

          selected_product_brand.status = 2;
          const product_brand_delete = selected_product_brand?.save();
          success_200(res, "Brand deleted");
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_product_brand = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_product_brand = await product_brands?.findById(id);

        if (!selected_product_brand) {
          failed_400(res, "Brand not found");
        } else {
          success_200(res, "", selected_product_brand);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_product_brands = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (!authorize) {
      return unauthorized(res);
    }

    const { search, status, sort, page, limit } = req?.body;

    const page_number = Number(page) || 1;
    const page_limit = Number(limit) || 10;

    const productBrandList = { branch: authorize?.branch, status: { $ne: 2 } };

    if (search) {
      productBrandList.name = { $regex: search, $options: "i" };
    }
    if (status == 0 || status) {
      productBrandList.status = status;
    }

    // Set sorting options
    let sortOption = { created: -1 }; // Default sorting by creation date
    if (sort == 0) {
      sortOption = { name: 1 }; // Sort by name ascending
    } else if (sort == 1) {
      sortOption = { name: -1 }; // Sort by name descending
    }

    // Get total count for pagination metadata
    const totalCount = await product_brands.countDocuments(productBrandList);

    // Fetch paginated data
    const paginated_product_brands = await product_brands
      .find(productBrandList)
      .sort(sortOption)
      .skip((page_number - 1) * page_limit)
      .limit(page_limit);

    const totalPages = Math.ceil(totalCount / page_limit);

    success_200(res, "", {
      currentPage: page_number,
      totalPages,
      totalCount,
      data: paginated_product_brands,
    });
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_product_brand_log = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_product_brand_log = await product_brands_log?.findById(
          id
        );

        if (!selected_product_brand_log) {
          failed_400(res, "Brand log not found");
        } else {
          success_200(res, "", selected_product_brand_log);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_product_brand_logs = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { brand } = req?.body;

      if (!brand) {
        incomplete_400(res);
      } else {
        const all_product_brand_logs = await product_brands_log?.find({
          brand: brand,
        });
        success_200(res, "", all_product_brand_logs);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_product_brand,
  update_product_brand,
  delete_product_brand,
  get_product_brand,
  get_all_product_brands,
  get_product_brand_log,
  get_all_product_brand_logs,
};
