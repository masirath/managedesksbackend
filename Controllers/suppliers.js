const { authorization } = require("../Global/authorization");
const {
  unauthorized,
  catch_400,
  incomplete_400,
  failed_400,
  success_200,
} = require("../Global/errors");
const products = require("../Models/products");
const suppliers = require("../Models/suppliers");
const suppliers_log = require("../Models/suppliers_log");

const create_supplier = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const {
        name,
        email,
        phone,
        catalog,
        tax,
        area,
        city,
        state,
        country,
        status,
        branch,
      } = req?.body;

      if (!name || !phone) {
        incomplete_400(res);
      } else {
        const selected_supplier_name = await suppliers?.findOne({
          name: name,
          branch: branch ? branch : authorize?.branch,
        });

        if (selected_supplier_name) {
          failed_400(res, "Supplier name exists");
        } else {
          const supplier = new suppliers({
            name: name,
            email: email,
            phone: phone,
            tax: tax,
            catalog: catalog,
            area: area,
            city: city,
            state: state,
            country: country,
            status: status ? status : 0,
            ref: authorize?.ref,
            branch: branch ? branch : authorize?.branch,
            created: new Date(),
            created_by: authorize?.id,
          });
          const supplier_save = await supplier?.save();

          success_200(res, "Supplier created");
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const update_supplier = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const {
        id,
        name,
        email,
        phone,
        catalog,
        tax,
        area,
        city,
        state,
        country,
        status,
        branch,
      } = req?.body;

      if (!id || !name || !phone) {
        incomplete_400(res);
      } else {
        const selected_supplier = await suppliers?.findById(id);

        if (!selected_supplier || selected_supplier?.status == 2) {
          failed_400(res, "Supplier not found");
        } else {
          const selected_supplier_name = await suppliers?.findOne({
            _id: { $ne: id },
            name: name,
            branch: branch ? branch : authorize?.branch,
          });

          if (selected_supplier_name) {
            failed_400(res, "Supplier name exists");
          } else {
            const supplier_log = new suppliers_log({
              supplier: id,
              name: selected_supplier?.name,
              email: selected_supplier?.email,
              phone: selected_supplier?.phone,
              catalog: selected_supplier?.catalog,
              tax: selected_supplier?.tax,
              area: selected_supplier?.area,
              city: selected_supplier?.city,
              state: selected_supplier?.state,
              country: selected_supplier?.country,
              status: selected_supplier?.status,
              ref: selected_supplier?.ref,
              branch: selected_supplier?.branch,
              updated: new Date(),
              updated_by: authorize?.id,
            });

            const supplier_log_save = await supplier_log?.save();

            selected_supplier.name = name;
            selected_supplier.email = email;
            selected_supplier.phone = phone;
            selected_supplier.catalog = catalog;
            selected_supplier.tax = tax;
            selected_supplier.area = area;
            selected_supplier.city = city;
            selected_supplier.state = state;
            selected_supplier.country = country;
            selected_supplier.status = status ? status : 0;
            selected_supplier.ref = authorize?.ref;
            selected_supplier.branch = branch ? branch : authorize?.branch;
            selected_supplier.updated = new Date();
            selected_supplier.updated_by = authorize?.id;

            const supplier_update = await selected_supplier?.save();
            success_200(res, "Supplier updated");
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

const delete_supplier = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_supplier = await suppliers?.findById(id);

        if (!selected_supplier || selected_supplier?.status == 2) {
          failed_400(res, "Supplier not found");
        } else {
          const supplier_log = new suppliers_log({
            supplier: selected_supplier?._id,
            name: selected_supplier?.name,
            email: selected_supplier?.email,
            phone: selected_supplier?.phone,
            catalog: selected_supplier?.catalog,
            tax: selected_supplier?.tax,
            area: selected_supplier?.area,
            city: selected_supplier?.city,
            state: selected_supplier?.state,
            country: selected_supplier?.country,
            status: selected_supplier?.status,
            ref: selected_supplier?.ref,
            branch: selected_supplier?.branch,
            updated: new Date(),
            updated_by: authorize?.id,
          });

          const supplier_log_save = await supplier_log?.save();

          selected_supplier.status = 2;
          const supplier_delete = await selected_supplier?.save();
          success_200(res, "Supplier deleted");
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_supplier = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.params;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_supplier = await suppliers?.findById(id);

        if (!selected_supplier || selected_supplier?.status == 2) {
          failed_400(res, "Supplier not found");
        } else {
          const all_products =
            selected_supplier?.catalog &&
            JSON?.parse?.(selected_supplier?.catalog);

          const catalog = [];

          if (all_products?.length > 0) {
            for (const value of all_products) {
              const item = await products?.findOne({ _id: value, status: 1 });
              if (item?._id) {
                catalog?.push(item);
              }
            }
          }

          const data = {
            ...selected_supplier._doc,
            catalog: catalog,
          };

          success_200(res, "", data);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_suppliers = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (!authorize) {
      return unauthorized(res);
    }

    const { search, sort, catalog, status, page, limit } = req?.body;

    const page_number = Number(page) || 1;
    const page_limit = Number(limit) || 10;

    const suppliersList = { branch: authorize?.branch, status: { $ne: 2 } };

    if (search) {
      suppliersList.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }
    if (catalog) {
      suppliersList.catalog = { $regex: catalog, $options: "i" };
    }
    if (status) {
      suppliersList.status = status;
    }
    if (status == 0) {
      suppliersList.status = status;
    }

    let sortOption = { name: 1 };
    if (sort == 0) {
      sortOption = { name: 1 };
    } else if (sort == 1) {
      sortOption = { name: -1 };
    }

    // Get total count for pagination metadata
    const totalCount = await suppliers.countDocuments(suppliersList);

    // Fetch paginated data
    const paginated_suppliers = await suppliers
      .find(suppliersList)
      .sort(sortOption)
      .skip((page_number - 1) * page_limit)
      .limit(page_limit);

    const totalPages = Math.ceil(totalCount / page_limit);

    success_200(res, "", {
      currentPage: page_number,
      totalPages,
      totalCount,
      data: paginated_suppliers,
    });
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

// const get_all_suppliers = async (req, res) => {
//   try {
//     const authorize = authorization(req);

//     if (authorize) {
//       const { search, sort, catalog, status } = req?.body;

//       const suppliersList = { branch: authorize?.branch };
//       suppliersList.status = { $ne: 2 };
//       search &&
//         (suppliersList.$or = [
//           { name: { $regex: search, $options: "i" } },
//           { email: { $regex: search, $options: "i" } },
//           { phone: { $regex: search, $options: "i" } },
//         ]);
//       catalog && (suppliersList.catalog = { $regex: catalog, $options: "i" });
//       status && (suppliersList.status = status);
//       status == 0 && (suppliersList.status = status);

//       let sortOption = { name: 1 };

//       if (sort == 0) {
//         sortOption = { name: 1 };
//       } else if (sort == 1) {
//         sortOption = { name: -1 };
//       }

//       const all_suppliers = await suppliers
//         ?.find(suppliersList)
//         ?.sort(sortOption);
//       success_200(res, "", all_suppliers);
//     } else {
//       unauthorized(res);
//     }
//   } catch (errors) {
//     catch_400(res, errors?.message);
//   }
// };

const get_supplier_log = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.params;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_suppliers_log = await suppliers_log?.findById(id);

        if (!selected_suppliers_log) {
          failed_400(res, "Supplier log not found");
        } else {
          success_200(res, "", selected_suppliers_log);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_suppliers_log = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { supplier } = req?.params;

      if (!supplier) {
        incomplete_400(res);
      } else {
        const all_suppliers_log = await suppliers_log?.find({
          branch: authorize?.branch,
        });
        success_200(res, "", all_suppliers_log);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_supplier,
  update_supplier,
  delete_supplier,
  get_supplier,
  get_all_suppliers,
  get_supplier_log,
  get_all_suppliers_log,
};
