require("dotenv").config();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { authorization } = require("../Global/authorization");
const {
  failed_400,
  unauthorized,
  catch_400,
  incomplete_400,
  success_200,
} = require("../Global/errors");
const inventories = require("../Models/inventories");
const inventories_log = require("../Models/inventories_log");
const products = require("../Models/products");
const inventories_units_details = require("../Models/inventories_units_details");
const inventories_units_details_log = require("../Models/inventories_units_details_log");
const purchase_orders = require("../Models/purchase_orders");

const get_next_inventory = async (req, res, number) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const total_inventories = await inventories.countDocuments({
        branch: authorize?.branch,
      });

      const next_inventory_number = number + total_inventories;

      const existing_purchase_order_number = await inventories.findOne({
        number: next_inventory_number,
        branch: authorize?.branch,
      });

      if (existing_purchase_order_number) {
        return await get_next_inventory(req, res, next_inventory_number);
      } else {
        return next_inventory_number;
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const create_inventory = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const {
        number,
        product,
        barcode,
        supplier,
        purchase_price,
        price_per_unit,
        sale_price,
        stock,
        tax,
        manufacture_date,
        expiry_date,
        details,
        status,
        branch,
      } = req?.body;

      let new_number = await get_next_inventory(req, res, 1000);
      let assigned_number = number ? number : new_number;

      if (
        !assigned_number ||
        !product ||
        !purchase_price ||
        !price_per_unit ||
        !sale_price
      ) {
        incomplete_400(res);
      } else {
        const selected_product = await products.findById(product);

        if (!selected_product) {
          failed_400(res, "Inventory product not found");
        } else {
          const selected_inventory_number = await inventories.findOne({
            number: assigned_number,
            branch: branch ? branch : authorize?.branch,
          });

          if (selected_inventory_number) {
            failed_400(res, "Inventory number exists");
          } else {
            const selected_inventory_barcode = await inventories.findOne({
              $and: [
                { barcode: { $ne: "" } },
                { barcode },
                { branch: branch || authorize?.branch },
              ],
            });

            if (selected_inventory_barcode) {
              failed_400(res, "Inventory barcode exists");
            } else {
              const inventory = new inventories({
                number: assigned_number,
                product: product,
                barcode: barcode,
                supplier: supplier,
                purchase_price: purchase_price,
                price_per_unit: price_per_unit,
                sale_price: sale_price,
                stock: stock ? stock : 0,
                tax: tax ? tax : 0,
                manufacture_date: manufacture_date ? manufacture_date : "",
                expiry_date: expiry_date ? expiry_date : "",
                status: status ? status : 0,
                ref: authorize?.ref,
                branch: branch ? branch : authorize?.branch,
                created: new Date(),
                created_by: authorize?.id,
              });

              const inventory_save = await inventory?.save();

              const unit_details = details;
              if (unit_details?.length > 0) {
                let total = unit_details?.length;
                let count = 0;

                for (value of unit_details) {
                  if (value?.name) {
                    const inventory_unit_detail = new inventories_units_details(
                      {
                        inventory: inventory_save?._id,
                        name: value?.name,
                        conversion: value?.conversion ? value?.conversion : 0,
                        purchase_price: value?.purchase_price
                          ? value?.purchase_price
                          : 0,
                        price_per_unit: value?.price_per_unit
                          ? value?.price_per_unit
                          : 0,
                        sale_price: value?.sale_price ? value?.sale_price : 0,
                        stock: value?.stock ? value?.stock : 0,
                        status: status ? status : 0,
                        ref: authorize?.ref,
                        branch: branch ? branch : authorize?.branch,
                        created: new Date(),
                        created_by: authorize?.id,
                      }
                    );

                    const inventory_unit_detail_save =
                      await inventory_unit_detail?.save();
                    count++;
                  } else {
                    count++;
                  }
                }

                if (total == count) {
                  success_200(res, "Inventory created");
                } else {
                  failed_400(res, "Inventory units not created");
                }
              } else {
                success_200(res, "Inventory created");
              }
            }
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

const update_inventory = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const {
        id,
        number,
        product,
        barcode,
        supplier,
        purchase_price,
        price_per_unit,
        sale_price,
        stock,
        tax,
        manufacture_date,
        expiry_date,
        details,
        status,
        branch,
      } = req?.body;

      let new_number = await get_next_inventory(req, res, 1000);
      let assigned_number = number ? number : new_number;

      if (
        !assigned_number ||
        !product ||
        !purchase_price ||
        !price_per_unit ||
        !sale_price
      ) {
        incomplete_400(res);
      } else {
        const selected_inventory = await inventories?.findById(id);

        if (!selected_inventory || selected_inventory.status == 2) {
          failed_400(res, "Inventory not found");
        } else {
          const selected_product = await products.findById(product);

          if (!selected_product) {
            failed_400(res, "Inventory product not found");
          } else {
            const selected_inventory_number = await inventories.findOne({
              _id: { $ne: id },
              number: assigned_number,
              branch: branch ? branch : authorize?.branch,
            });

            if (selected_inventory_number) {
              failed_400(res, "Inventory number exists");
            } else {
              const selected_inventory_barcode = await inventories.findOne({
                $and: [
                  { _id: { $ne: id } },
                  { barcode: { $ne: "" } },
                  { barcode },
                  { branch: branch || authorize?.branch },
                ],
              });

              if (selected_inventory_barcode) {
                failed_400(res, "Inventory barcode exists");
              } else {
                const inventory_log = new inventories_log({
                  inventory: selected_inventory?._id,
                  number: selected_inventory?.number,
                  product: selected_inventory?.product,
                  barcode: selected_inventory?.barcode,
                  supplier: selected_inventory?.supplier,
                  purchase_price: selected_inventory?.purchase_price,
                  price_per_unit: selected_inventory?.price_per_unit,
                  sale_price: selected_inventory?.sale_price,
                  stock: selected_inventory?.stock,
                  tax: selected_inventory?.tax,
                  manufacture_date: selected_inventory?.manufacture_date,
                  expiry_date: selected_inventory?.expiry_date,
                  status: selected_inventory?.status,
                  ref: selected_inventory?.ref,
                  branch: selected_inventory?.branch,
                  updated: new Date(),
                  updated_by: authorize?.id,
                });
                const inventory_log_save = await inventory_log?.save();

                selected_inventory.number = assigned_number;
                selected_inventory.product = product;
                selected_inventory.barcode = barcode;
                selected_inventory.supplier = supplier;
                selected_inventory.purchase_price = purchase_price;
                selected_inventory.price_per_unit = price_per_unit;
                selected_inventory.sale_price = sale_price;
                selected_inventory.stock = stock ? stock : 0;
                selected_inventory.tax = tax ? tax : 0;
                selected_inventory.manufacture_date = manufacture_date
                  ? manufacture_date
                  : "";
                selected_inventory.expiry_date = expiry_date ? expiry_date : "";
                selected_inventory.status = status ? status : 0;
                selected_inventory.branch = branch ? branch : authorize?.branch;
                selected_inventory.created = new Date();
                selected_inventory.created_by = authorize?.id;

                const inventory_update = await selected_inventory?.save();

                // inventory unit details update
                const selected_inventory_unit_details_delete =
                  await inventories_units_details?.deleteMany({
                    inventory: selected_inventory?._id,
                  });

                const unit_details = details;
                if (unit_details?.length > 0) {
                  let total = unit_details?.length;
                  let count = 0;

                  for (value of unit_details) {
                    if (value?.name) {
                      const inventory_unit_detail =
                        new inventories_units_details({
                          inventory: inventory_update?._id,
                          name: value?.name,
                          conversion: value?.conversion ? value?.conversion : 0,
                          purchase_price: value?.purchase_price
                            ? value?.purchase_price
                            : 0,
                          price_per_unit: value?.price_per_unit
                            ? value?.price_per_unit
                            : 0,
                          sale_price: value?.sale_price ? value?.sale_price : 0,
                          stock: value?.stock ? value?.stock : 0,
                          status: status ? status : 0,
                          ref: authorize?.ref,
                          branch: branch ? branch : authorize?.branch,
                          created: new Date(),
                          created_by: authorize?.id,
                        });

                      const inventory_unit_detail_save =
                        await inventory_unit_detail?.save();
                      count++;
                    } else {
                      count++;
                    }
                  }

                  if (total == count) {
                    success_200(res, "Inventory updated");
                  } else {
                    failed_400(res, "Inventory units not updated");
                  }
                } else {
                  success_200(res, "Inventory updated");
                }
              }
            }
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

const delete_inventory = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_inventory = await inventories.findById(id);

        if (!selected_inventory || selected_inventory.status == 2) {
          failed_400(res, "Inventory not found");
        } else {
          const inventory_log = new inventories_log({
            inventory: selected_inventory?._id,
            number: selected_inventory?.number,
            product: selected_inventory?.product,
            barcode: selected_inventory?.barcode,
            purchase_price: selected_inventory?.purchase_price,
            price_per_unit: selected_inventory?.price_per_unit,
            sale_price: selected_inventory?.sale_price,
            stock: selected_inventory?.stock,
            tax: selected_inventory?.tax,
            manufacture_date: selected_inventory?.manufacture_date,
            expiry_date: selected_inventory?.expiry_date,
            status: selected_inventory?.status,
            ref: selected_inventory?.ref,
            branch: selected_inventory?.branch,
            updated: new Date(),
            updated_by: authorize?.id,
          });

          const inventory_log_save = await inventory_log.save();

          selected_inventory.status = 2;
          const inventory_delete = await selected_inventory.save();
          success_200(res, "Inventory deleted");
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors.message);
  }
};

const get_inventory = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_inventory = await inventories
          ?.findById(id)
          ?.populate({
            path: "product",
            match: { status: 1 },
            populate: { path: "unit" },
          })
          ?.populate("supplier");

        if (!selected_inventory || selected_inventory?.status == 2) {
          failed_400(res, "Inventory not found");
        } else {
          const inventory = selected_inventory?.toObject();
          const selected_inventories_units_details =
            await inventories_units_details?.find({
              inventory: selected_inventory?._id,
            });

          success_200(res, "", {
            ...inventory,
            inventory_unit_details: selected_inventories_units_details,
          });
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_inventories = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (!authorize) {
      return unauthorized(res);
    }

    const {
      search,
      sort,
      product,
      date,
      type,
      status,
      purchase,
      supplier,
      page,
      limit,
      stock,
    } = req.body;

    const page_number = Number(page) || 1;
    const page_limit = Number(limit) || 10;
    const skip = (page_number - 1) * page_limit;

    const inventoryList = {
      branch: authorize.branch,
      status: { $ne: 2 },
    };

    if (!stock) {
      inventoryList.stock = { $gt: 0 };
    }

    if (product) inventoryList.product = product;
    if (purchase) inventoryList.purchase = purchase;
    if (supplier) inventoryList.supplier = supplier;
    if (type != null) inventoryList.type = type;
    if (status != null) inventoryList.status = status;
    if (date?.start && date?.end) {
      inventoryList.expiry_date = {
        $gte: new Date(date.start),
        $lte: new Date(date.end),
      };
    }

    let sortOption = { created: -1 };
    if (sort === 0) sortOption = { stock: 1 };
    else if (sort === 1) sortOption = { stock: -1 };
    else if (sort === 2) sortOption = { expiry_date: 1 };

    // Search by inventory key number
    if (search) {
      const inventoryMatch = await inventories
        .find({
          $or: [
            { number: !isNaN(search) ? Number(search) : undefined },
            { key_number: !isNaN(search) ? Number(search) : undefined },
          ].filter(Boolean),
        })
        .select("_id");

      if (inventoryMatch.length > 0) {
        inventoryList._id = { $in: inventoryMatch.map((inv) => inv._id) };
      } else {
        // Fetch product IDs matching the search query
        const matchingProducts = await products
          .find({
            $or: [
              { name: { $regex: search, $options: "i" } },
              { barcode: { $regex: search, $options: "i" } },
            ],
          })
          .select("_id");

        const productIds = matchingProducts.map((p) => p._id);

        if (productIds.length > 0) {
          inventoryList.product = { $in: productIds };
        } else {
          // If search is provided but no matching results, return empty response
          return success_200(res, "", {
            currentPage: page_number,
            totalPages: 0,
            totalCount: 0,
            data: [],
          });
        }
      }
    }

    // Get total count before filtering purchases
    const totalCount = await inventories.countDocuments(inventoryList);

    // Fetch paginated data
    const all_inventories = await inventories
      .find(inventoryList)
      .populate({
        path: "product",
        populate: { path: "unit" },
      })
      .populate("purchase")
      .populate("supplier")
      .sort(sortOption);

    const totalPages = Math.ceil(all_inventories.length / page_limit);

    // Apply pagination after filtering
    const paginatedData = all_inventories.slice(skip, skip + page_limit);

    success_200(res, "", {
      currentPage: page_number,
      totalPages,
      totalCount: all_inventories?.length,
      data: paginatedData,
    });
  } catch (error) {
    catch_400(res, error?.message);
  }
};

// const get_all_inventories = async (req, res) => {
//   try {
//     const authorize = authorization(req);

//     if (!authorize) {
//       return unauthorized(res);
//     }

//     const {
//       search,
//       sort,
//       product,
//       date,
//       type,
//       status,
//       purchase,
//       supplier,
//       page,
//       limit,
//       stock,
//     } = req.body;

//     const page_number = Number(page) || 1;
//     const page_limit = Number(limit) || 10;
//     const skip = (page_number - 1) * page_limit;

//     const inventoryList = {
//       branch: authorize.branch,
//       status: { $ne: 2 },
//     };

//     if (!stock) {
//       inventoryList.stock = { $gt: 0 };
//     }

//     if (product) inventoryList.product = product;
//     if (purchase) inventoryList.purchase = purchase;
//     if (supplier) inventoryList.purchase = supplier;
//     if (type != null) inventoryList.type = type;
//     if (status != null) inventoryList.status = status;
//     if (status != null) inventoryList.status = status;
//     if (date?.start && date?.end) {
//       inventoryList.expiry_date = {
//         $gte: new Date(date.start),
//         $lte: new Date(date.end),
//       };
//     }

//     let sortOption = { created: -1 };
//     if (sort === 0) sortOption = { stock: 1 };
//     else if (sort === 1) sortOption = { stock: -1 };
//     else if (sort === 2) sortOption = { expiry_date: 1 };

//     // Fetch product IDs matching the search query
//     let productIds = [];
//     if (search) {
//       const matchingProducts = await products
//         .find({
//           $or: [
//             { name: { $regex: search, $options: "i" } },
//             { barcode: { $regex: search, $options: "i" } },
//           ],
//         })
//         .select("_id");

//       productIds = matchingProducts.map((p) => p._id);
//     }

//     // Apply product search if productIds are found
//     if (productIds.length > 0) {
//       inventoryList.product = { $in: productIds };
//     } else if (search) {
//       // If search is provided but no matching products, return empty result
//       return success_200(res, "", {
//         currentPage: page_number,
//         totalPages: 0,
//         totalCount: 0,
//         data: [],
//       });
//     }

//     // Get total count before filtering purchases
//     const totalCount = await inventories.countDocuments(inventoryList);

//     // Fetch paginated data
//     const all_inventories = await inventories
//       .find(inventoryList)
//       .populate({
//         path: "product",
//         populate: { path: "unit" },
//       })
//       .populate("purchase")
//       .populate("supplier")
//       .sort(sortOption);

//     const totalPages = Math.ceil(all_inventories.length / page_limit);

//     // Apply pagination after filtering
//     const paginatedData = all_inventories.slice(skip, skip + page_limit);

//     success_200(res, "", {
//       currentPage: page_number,
//       totalPages,
//       totalCount: all_inventories?.length,
//       data: paginatedData,
//     });
//   } catch (error) {
//     catch_400(res, error?.message);
//   }
// };

const get_inventory_log = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_inventory_log = await inventories_log?.findById(id);

        if (!selected_inventory_log) {
          failed_400(res, "Inventory not found");
        } else {
          success_200(res, "", selected_inventory_log);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_inventories_log = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { inventory } = req?.body;

      if (!inventory) {
        incomplete_400(res);
      } else {
        const all_inventories_log = await inventories_log?.find({
          inventory: inventory,
        });
        success_200(res, "", all_inventories_log);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_inventory_unit_detail = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_inventory_unit_detail = await inventories_units_details
          ?.findById(id)
          ?.populate("name");

        if (!selected_inventory_unit_detail) {
          failed_400(res, "Unit not found");
        } else {
          success_200(res, "", selected_inventory_unit_detail);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_inventory_barcode = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { barcode } = req?.body;

      if (!barcode) {
        incomplete_400(res);
      } else {
        const selected_inventory = await inventories
          ?.findOne({ barcode: barcode })
          ?.populate({
            path: "product",
            match: { status: 1 },
            populate: { path: "unit" },
          });

        if (!selected_inventory || selected_inventory?.status == 2) {
          failed_400(res, "Inventory not found");
        } else {
          const inventory = selected_inventory?.toObject();
          const selected_inventories_units_details =
            await inventories_units_details?.find({
              inventory: selected_inventory?._id,
            });

          success_200(res, "", {
            ...inventory,
            inventory_unit_details: selected_inventories_units_details,
          });
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_inventory,
  update_inventory,
  delete_inventory,
  get_inventory,
  get_all_inventories,
  get_inventory_log,
  get_all_inventories_log,
  get_inventory_unit_detail,
  get_inventory_barcode,
};
