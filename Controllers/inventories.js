require("dotenv").config();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  authorization,
  user_authorization,
} = require("../Global/authorization");
const {
  failed_400,
  unauthorized,
  catch_400,
  incomplete_400,
  success_200,
  unauthorized_403,
} = require("../Global/errors");
const inventories = require("../Models/inventories");
const inventories_log = require("../Models/inventories_log");
const products = require("../Models/products");
const inventories_units_details = require("../Models/inventories_units_details");
const inventories_units_details_log = require("../Models/inventories_units_details_log");
const purchase_orders = require("../Models/purchase_orders");
const mongoose = require("mongoose");
const { Parser, parseAsync } = require("json2csv");
const csv = require("fast-csv");
const moment = require("moment-timezone");
const product_units_details = require("../Models/product_units_details");
const users = require("../Models/users");
const roles = require("../Models/roles");
const roles_details = require("../Models/roles_details");

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
      let user_authentication = await user_authorization(
        authorize,
        "Inventory",
        "create"
      );

      if (!user_authentication) {
        unauthorized_403(res);
      } else {
        const {
          number,
          product,
          barcode,
          supplier,
          purchase_price,
          price_per_unit,
          sale_price,
          wholesale_price,
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
              status: { $ne: 2 },
            });

            if (selected_inventory_number) {
              failed_400(res, "Inventory number exists");
            } else {
              const selected_inventory_barcode = await inventories.findOne({
                $and: [
                  { barcode: { $ne: "" } },
                  { barcode },
                  { branch: branch || authorize?.branch },
                  { status: { $ne: 2 } },
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
                  wholesale_price: wholesale_price,
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
                      const inventory_unit_detail =
                        new inventories_units_details({
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
                          wholesale_price: value?.wholesale_price
                            ? value?.wholesale_price
                            : 0,
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
      let user_authentication = await user_authorization(
        authorize,
        "Inventory",
        "update"
      );

      if (!user_authentication) {
        unauthorized_403(res);
      } else {
        const {
          id,
          number,
          product,
          barcode,
          supplier,
          purchase_price,
          price_per_unit,
          sale_price,
          wholesale_price,
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
                status: { $ne: 2 },
              });

              // if (selected_inventory_number) {
              //   failed_400(res, "Inventory number exists");
              // } else {
              const selected_inventory_barcode = await inventories.findOne({
                $and: [
                  { _id: { $ne: id } },
                  { barcode: { $ne: "" } },
                  { barcode },
                  { branch: branch || authorize?.branch },
                  { status: { $ne: 2 } },
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
                selected_inventory.wholesale_price = wholesale_price;
                selected_inventory.stock = stock ? stock : 0;
                selected_inventory.tax = tax ? tax : 0;
                selected_inventory.manufacture_date = manufacture_date
                  ? manufacture_date
                  : "";
                selected_inventory.expiry_date = expiry_date ? expiry_date : "";
                selected_inventory.status = status ? status : 0;
                selected_inventory.branch = branch ? branch : authorize?.branch;
                // selected_inventory.created = new Date();
                // selected_inventory.created_by = authorize?.id;

                const inventory_update = await selected_inventory?.save();

                //unit details
                const unit_details = details;

                const selected_inventory_unit_details =
                  await inventories_units_details?.find({
                    inventory: selected_inventory?._id,
                  });

                const validUnitIds = unit_details.map((unit) =>
                  unit?.id?.toString()
                );

                const missingUnits = selected_inventory_unit_details.filter(
                  (item) => !validUnitIds.includes(item?._id?.toString())
                );

                if (missingUnits.length > 0) {
                  await inventories_units_details.deleteMany({
                    _id: { $in: missingUnits.map((item) => item._id) },
                  });
                }

                if (unit_details?.length > 0) {
                  let total = unit_details?.length;
                  let count = 0;

                  for (value of unit_details) {
                    if (value?.id) {
                      //update unit details
                      const selected_inventory_unit_detail =
                        await inventories_units_details?.findById(value?.id);

                      selected_inventory_unit_detail.inventory =
                        inventory_update?._id;
                      selected_inventory_unit_detail.name = value?.name;
                      selected_inventory_unit_detail.conversion =
                        value?.conversion ? value?.conversion : 0;
                      selected_inventory_unit_detail.purchase_price =
                        value?.purchase_price ? value?.purchase_price : 0;
                      selected_inventory_unit_detail.price_per_unit =
                        value?.price_per_unit ? value?.price_per_unit : 0;
                      selected_inventory_unit_detail.sale_price =
                        value?.sale_price ? value?.sale_price : 0;
                      selected_inventory_unit_detail.wholesale_price =
                        value?.wholesale_price ? value?.wholesale_price : 0;
                      selected_inventory_unit_detail.stock = value?.stock
                        ? value?.stock
                        : 0;

                      const selected_inventory_unit_detail_save =
                        await selected_inventory_unit_detail?.save();
                      count++;
                    } else {
                      //create unit details
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
                          wholesale_price: value?.wholesale_price
                            ? value?.wholesale_price
                            : 0,
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
              // }
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
      let user_authentication = await user_authorization(
        authorize,
        "Inventory",
        "delete"
      );

      if (!user_authentication) {
        unauthorized_403(res);
      } else {
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
      // let user_authentication = await user_authorization(
      //   authorize,
      //   "Inventory",
      //   "update"
      // );

      // if (!user_authentication) {
      //   unauthorized_403(res);
      // } else {
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
          ?.populate("supplier")
          ?.populate("branch");

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
            // user_authentication: user_authentication,
          });
        }
      }
    }
    // } else {
    //   unauthorized(res);
    // }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

//  { name: { $regex: `^${search}`, $options: "i" } },
// { name: { $regex: search, $options: "i" } }

const get_all_inventories = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) return unauthorized(res);

    const {
      search,
      sort,
      product,
      date,
      type,
      status,
      purchase,
      received,
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

    if (!stock) inventoryList.stock = { $gt: 0 };
    if (product) inventoryList.product = product;
    if (purchase) inventoryList.purchase = purchase;
    if (received) inventoryList.receive = received;
    if (supplier) inventoryList.supplier = supplier;
    if (type != null) inventoryList.type = type;
    if (status != null) inventoryList.status = status;

    if (date?.start && date?.end) {
      let startDate = new Date(date.start);
      startDate.setHours(0, 0, 0, 0);

      let endDate = new Date(date.end);
      endDate.setHours(23, 59, 59, 999);

      inventoryList.expiry_date = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    let sortOption = {};

    if (sort === 1) sortOption = { stock: 1 };
    else if (sort === 2) sortOption = { stock: -1 };
    else if (sort === 3) sortOption = { expiry_date: 1 };
    else if (sort === 4) sortOption = { expiry_date: -1 };
    else if (sort === 5) sortOption = { created: 1 };
    else if (sort === 6) sortOption = { created: -1 };

    if (search) {
      const productIds = await products
        .find(
          {
            $or: [
              { name: { $regex: `^${search}`, $options: "i" } },
              { barcode: { $regex: search, $options: "i" } },
            ],
          },
          { _id: 1 }
        )
        .sort({ name: 1 })
        .lean();

      if (productIds.length > 0) {
        inventoryList.product = { $in: productIds.map((p) => p._id) };
      } else {
        return success_200(res, "", {
          currentPage: page_number,
          totalPages: 0,
          totalCount: 0,
          data: [],
        });
      }
      sortOption = { expiry_date: 1 };
    }

    // Fetch total count
    const totalCount = await inventories.countDocuments(inventoryList);

    // Fetch inventory data
    const all_inventories = await inventories
      .find(inventoryList)
      .populate({
        path: "product",
        populate: { path: "unit" },
      })
      .populate("purchase")
      .populate("receive")
      .populate("supplier")
      .sort(sortOption)
      .skip(skip)
      .limit(page_limit)
      .lean();

    // Fetch related inventories_units_details in bulk
    const inventoryIds = all_inventories.map((inv) => inv._id);
    const all_details = await inventories_units_details
      .find({ inventory: { $in: inventoryIds } })
      .lean();

    // Group details by inventory ID
    const detailMap = {};
    for (const detail of all_details) {
      const invId = detail.inventory.toString();
      if (!detailMap[invId]) {
        detailMap[invId] = [];
      }
      detailMap[invId].push(detail);
    }

    // Append inventories_units_details to each inventory record
    for (const inv of all_inventories) {
      inv.inventories_units_details = detailMap[inv._id.toString()] || [];
    }

    // Final sorting by product name (after population)
    if (search) {
      all_inventories.sort((a, b) => {
        const nameA = a.product?.name?.toLowerCase() || "";
        const nameB = b.product?.name?.toLowerCase() || "";
        if (nameA !== nameB) return nameA.localeCompare(nameB);
        return new Date(a.expiry_date) - new Date(b.expiry_date);
      });
    }

    const totalPages = Math.ceil(totalCount / page_limit);

    success_200(res, "", {
      currentPage: page_number,
      totalPages,
      totalCount,
      data: all_inventories,
    });
  } catch (error) {
    catch_400(res, error?.message);
  }
};

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
          ?.findOne({ barcode: barcode, branch: authorize?.branch })
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

const download_inventory_csv = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (!authorize) {
      return unauthorized(res);
    }

    const {
      search,
      sort,
      product,
      supplier,
      purchase,
      date,
      type,
      branch,
      status,
    } = req.body;

    let selected_branch = new mongoose.Types.ObjectId(authorize?.branch);

    if (branch === "ALL") {
      selected_branch = "ALL";
    } else {
      selected_branch = new mongoose.Types.ObjectId(
        branch || authorize?.branch
      );
    }

    const queryConditions = { ref: authorize.ref };
    if (selected_branch !== "ALL") {
      queryConditions.branch = selected_branch;
    }

    const inventoryList = {
      ...queryConditions,
      status: { $ne: 2 },
      stock: { $gt: 0 },
    };

    if (product) inventoryList.product = product;
    if (supplier) inventoryList.supplier = supplier;
    if (purchase) inventoryList.purchase = purchase;
    if (type != null) inventoryList.type = type;
    if (status != null) inventoryList.status = status;
    if (date?.start && date?.end) {
      inventoryList.expiry_date = {
        $gte: new Date(date.start),
        $lte: new Date(date.end),
      };
    }

    let sortOption = { created: -1 };

    if (sort === 3) sortOption = { purchase_price: 1 };
    else if (sort === 4) sortOption = { purchase_price: -1 };
    else if (sort === 5) sortOption = { price_per_unit: 1 };
    else if (sort === 6) sortOption = { price_per_unit: -1 };
    else if (sort === 7) sortOption = { sale_price: 1 };
    else if (sort === 8) sortOption = { sale_price: -1 };
    else if (sort === 9) sortOption = { stock: 1 };
    else if (sort === 10) sortOption = { stock: -1 };
    else if (sort === 11) sortOption = { expiry_date: 1 };
    else if (sort === 12) sortOption = { expiry_date: -1 };

    let productIds = [];
    if (search) {
      const matchingProducts = await products
        .find({
          $or: [
            { name: { $regex: search, $options: "i" } },
            { barcode: { $regex: search, $options: "i" } },
          ],
        })
        .select("_id");

      productIds = matchingProducts.map((p) => p._id);
    }

    if (productIds.length > 0) {
      inventoryList.product = { $in: productIds };
    } else if (search) {
      return res.status(200).attachment("inventory.csv").send("");
    }

    const all_inventories = await inventories
      .find(inventoryList)
      .populate({
        path: "product",
        populate: { path: "unit" },
      })
      .populate("purchase")
      .populate("supplier")
      .populate("branch")
      .sort(sortOption);

    const inventoryData = all_inventories.map((inventory) => {
      const batch = inventory?.number;
      const price_per_unit = parseFloat(inventory.price_per_unit) || 0;
      const purchase_price = parseFloat(inventory.purchase_price) || 0;
      const stock = parseFloat(inventory.stock) || 0;
      const sale_price = parseFloat(inventory.sale_price) || 0;

      const total = price_per_unit * stock;
      const total_sales = sale_price * stock;

      const margin =
        sale_price > 0 ? ((sale_price - price_per_unit) / sale_price) * 100 : 0;

      const gain = sale_price > 0 ? sale_price - price_per_unit : 0;

      return {
        product_name: inventory.product?.name || "",
        number: batch || "",
        purchase_price: purchase_price,
        price_per_unit: price_per_unit,
        sale_price: sale_price,
        expiry_date: inventory.expiry_date
          ? moment(inventory.expiry_date)?.format("DD-MM-YYYY")
          : "",
        stock: stock,
        // barcode: inventory.product?.barcode || "",
        // Unit: inventory.product?.unit?.name || "",
        // Supplier: inventory.supplier?.name || "",
        // Purchase: inventory.purchase?._id || "",
        // Branch: inventory.branch?.name || "",
        // "Total Cost": total.toFixed(2),
        // "Total Sale": total_sales.toFixed(2),
        // Margin: margin.toFixed(2) + "%",
        // Gain: gain.toFixed(2),
      };
    });

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(inventoryData);

    res.header("Content-Type", "text/csv");
    res.attachment("inventory_report.csv");
    return res.send(csv);
  } catch (error) {
    return catch_400(res, error?.message);
  }
};

const create_inventories_csv = async (req, res) => {
  /* ───────── Auth & file checks ───────── */
  const auth = authorization(req);
  if (!auth) return unauthorized(res);
  if (!req.file) return incomplete_400(res, "CSV file missing");

  /* ───────── Parse CSV into memory (small/medium files) ───────── */
  const rows = [];
  fs.createReadStream(req.file.path)
    .pipe(csv.parse({ headers: true, trim: true }))
    .on("error", (err) => catch_400(res, err.message))
    .on("data", (row) => rows.push(row))
    .on("end", async () => {
      try {
        /* ───────── Iterate each row ───────── */
        for (const row of rows) {
          const {
            number,
            product_name,
            barcode,
            supplier,
            purchase_price,
            price_per_unit,
            sale_price,
            wholesale_price,
            stock,
            tax,
            manufacture_date,
            expiry_date,
            status,
            branch,
          } = row;

          /* ---- basic validation ---- */
          if (
            !product_name
            // !purchase_price ||
            // !price_per_unit ||
            // !sale_price
            //|| !stock
          ) {
            throw new Error(`Missing mandatory fields: ${JSON.stringify(row)}`);
          }

          if (stock) {
            /* ---- find existing product ---- */
            const productDoc = await products.findOne({
              name: product_name,
              branch: branch || auth.branch,
              status: { $ne: 2 },
            });

            if (!productDoc) {
              throw new Error(`Product not found: ${product_name}`);
            }

            if (productDoc) {
              /* ---- optional product-unit ---- */
              const unitDoc = await product_units_details
                .findOne({
                  product: productDoc._id,
                })
                ?.populate("name");

              /* ---- inventory number ---- */
              const nextNumber = await get_next_inventory(req, res, 1000);
              const invNumber = number || nextNumber;
              const numberExists = await inventories.findOne({
                number: invNumber,
                branch: branch || auth.branch,
                status: { $ne: 2 },
              });

              // if (numberExists) {
              //   throw new Error(`Inventory number ${invNumber} already exists`);
              // }

              const tz = "Asia/Muscat";

              const inventoryDoc = await inventories.create({
                number: invNumber,
                product: productDoc._id,
                barcode,
                supplier,
                purchase_price: parseFloat(purchase_price || 0),
                price_per_unit: parseFloat(price_per_unit || 0),
                sale_price: parseFloat(sale_price || 0),
                wholesale_price: parseFloat(wholesale_price || 0),
                stock: parseFloat(stock || 0),
                tax: parseFloat(tax || 0),
                manufacture_date: manufacture_date
                  ? moment(manufacture_date, "D/M/YYYY").toDate()
                  : null,
                // expiry_date: expiry_date
                //   ? moment
                //       .tz(expiry_date, "D/M/YYYY", tz)
                //       .startOf("day")
                //       .toDate()
                //   : null,
                expiry_date: expiry_date
                  ? new Date(
                      moment
                        .utc(expiry_date, "D/M/YYYY")
                        .format("YYYY-MM-DDT00:00:00[Z]")
                    )
                  : null,
                status: parseInt(status || 1),
                ref: auth.ref,
                branch: branch || auth.branch,
                created: new Date(),
                created_by: auth.id,
              });

              /* ---- create inventory-unit-detail (if product has >1 conversion) ---- */
              if (unitDoc && parseFloat(unitDoc.conversion) > 1) {
                const conv = parseInt(unitDoc.conversion);
                await inventories_units_details.create({
                  inventory: inventoryDoc._id,
                  name: unitDoc?.name?.name,
                  conversion: conv,
                  purchase_price: parseFloat(purchase_price) / conv,
                  price_per_unit: parseFloat(price_per_unit) / conv,
                  sale_price: parseFloat(sale_price) / conv,
                  wholesale_price: parseFloat(wholesale_price || 0) / conv,
                  stock: parseFloat(stock) * conv,
                  status: 1,
                  ref: auth.ref,
                  branch: branch || auth.branch,
                  created: new Date(),
                  created_by: auth.id,
                });
              }
            }
          }
        }

        success_200(res, `${rows.length} inventory items created successfully`);
      } catch (err) {
        catch_400(res, err.message);
      } finally {
        /* always delete tmp upload */
        fs.unlink(
          req.file.path,
          (e) => e && console.error("Temp-file delete failed:", e)
        );
      }
    });
};

//product name missing
// const create_inventories_csv = async (req, res) => {
//   const auth = authorization(req);
//   if (!auth) return unauthorized(res);
//   if (!req.file) return incomplete_400(res, "CSV file missing");

//   const rows = [];
//   fs.createReadStream(req.file.path)
//     .pipe(csv.parse({ headers: true, trim: true }))
//     .on("error", (err) => catch_400(res, err.message))
//     .on("data", (row) => rows.push(row))
//     .on("end", async () => {
//       try {
//         let updatedProducts = [];
//         let nonUpdatedProducts = [];

//         for (const row of rows) {
//           const { product_name, branch } = row;

//           if (!product_name) continue;

//           const branchId = branch || auth.branch;

//           const existingProduct = await products.findOne({
//             name: product_name,
//             branch: branchId,
//             status: { $ne: 2 },
//           });

//           if (existingProduct) {
//             updatedProducts?.push(product_name);
//           } else {
//             nonUpdatedProducts?.push(product_name);
//           }
//         }

//         success_200(res, `Product names.`, {
//           updated_product_names: updatedProducts,
//           non_updated_product_names: nonUpdatedProducts,
//         });
//       } catch (err) {
//         catch_400(res, err.message);
//       } finally {
//         fs.unlink(
//           req.file.path,
//           (e) => e && console.error("Temp-file delete failed:", e)
//         );
//       }
//     });
// };

//VAT adding
// const create_inventories_csv = async (req, res) => {
//   const auth = authorization(req);
//   if (!auth) return unauthorized(res);
//   if (!req.file) return incomplete_400(res, "CSV file missing");

//   const rows = [];
//   fs.createReadStream(req.file.path)
//     .pipe(csv.parse({ headers: true, trim: true }))
//     .on("error", (err) => catch_400(res, err.message))
//     .on("data", (row) => rows.push(row))
//     .on("end", async () => {
//       try {
//         let updatedCount = 0;
//         let updatedProducts = [];
//         let nonUpdatedProducts = [];

//         for (const row of rows) {
//           const { product_name, sale_price, branch } = row;

//           if (!product_name) continue;

//           const branchId = branch || auth.branch;

//           const existingProduct = await products.findOne({
//             name: product_name,
//             branch: branchId,
//             status: { $ne: 2 },
//           });

//           if (!existingProduct) continue;

//           const result = await inventories.updateMany(
//             { product: existingProduct._id },
//             // { $set: { tax: 5 } }
//             { $set: { sale_price: sale_price } }
//           );

//           // updatedCount += result.modifiedCount;
//           if (result.modifiedCount > 0) {
//             updatedCount += result.modifiedCount;
//             updatedProducts.push(product_name);
//           } else {
//             nonUpdatedProducts.push(product_name);
//           }
//         }

//         // success_200(res, `${updatedCount} inventory items updated with VAT 5.`);
//         success_200(
//           res,
//           `${updatedCount} inventory items updated with VAT 5.`,
//           {
//             updated_product_names: updatedProducts,
//             non_updated_product_names: nonUpdatedProducts,
//           }
//         );
//       } catch (err) {
//         catch_400(res, err.message);
//       } finally {
//         fs.unlink(
//           req.file.path,
//           (e) => e && console.error("Temp-file delete failed:", e)
//         );
//       }
//     });
// };

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
  download_inventory_csv,
  create_inventories_csv,
  create_inventories_csv,
};
