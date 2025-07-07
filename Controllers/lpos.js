const { authorization } = require("../Global/authorization");
const {
  failed_400,
  unauthorized,
  catch_400,
  incomplete_400,
  success_200,
} = require("../Global/errors");
const { checknull } = require("../Global/checknull");
const products = require("../Models/products");
const product_units_details = require("../Models/product_units_details");
const lpos = require("../Models/lpos");
const lpos_details = require("../Models/lpos_details");
const lpos_units_details = require("../Models/lpos_units_details");

const { default: mongoose } = require("mongoose");

const get_next_lpo = async (req, res, number) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const total_lpo = await lpos.countDocuments({
        branch: authorize?.branch,
      });

      const next_lpo_number = number + total_lpo;

      const existing_lpo_number = await lpos.findOne({
        number: next_lpo_number,
        branch: authorize?.branch,
      });

      if (existing_lpo_number) {
        return await get_next_lpo(req, res, next_lpo_number);
      } else {
        return next_lpo_number;
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_next_inventories = async (req, res, number) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const total_inventories = await inventories.countDocuments({
        branch: authorize?.branch,
      });

      const next_inventories_number = number + total_inventories;

      const existing_inventories_number = await inventories.findOne({
        number: next_inventories_number,
        branch: authorize?.branch,
      });

      if (existing_inventories_number) {
        return await get_next_inventories(req, res, next_inventories_number);
      } else {
        return next_inventories_number;
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const create_lpo = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const {
        supplier,
        number,
        invoice,
        date,
        due_date,
        details,
        discount,
        delivery,
        status,
        branch,
      } = req?.body;

      let new_number = await get_next_lpo(req, res, 1000);
      let assigned_number = number ? number : new_number;

      if (
        !supplier ||
        !assigned_number ||
        !date ||
        !due_date ||
        !details?.length > 0
      ) {
        incomplete_400(res);
      } else {
        const selected_lpo_number = await lpos?.findOne({
          number: assigned_number,
          branch: branch ? branch : authorize?.branch,
          status: 1,
        });

        if (selected_lpo_number) {
          failed_400(res, "Lpo number exists");
        } else {
          //create lpo order
          const lpo = new lpos({
            supplier: supplier,
            number: assigned_number,
            invoice: invoice,
            date: date,
            due_date: due_date,
            subtotal: 0,
            taxamount: 0,
            discount: 0,
            delivery: 0,
            delivery_status: 0,
            delivery_date: "",
            payment_status: 0,
            total: 0,
            status: status ? status : 0,
            ref: authorize?.ref,
            branch: branch ? branch : authorize?.branch,
            created: new Date(),
            created_by: authorize?.id,
          });

          const lpo_save = await lpo?.save();

          //lpo order details
          let lpo_subtotal = 0;
          let lpo_taxamount = 0;
          let lpo_total = 0;
          let delivery_count = 0;
          let count = 0;

          if (details?.length > 0) {
            for (value of details) {
              const selected_product = await products
                ?.findById?.(value?.description)
                ?.populate({
                  path: "unit",
                  match: { status: { $ne: 2 } },
                });

              if (selected_product) {
                let lpo_unit = value?.unit ? value?.unit : "";
                let lpo_unit_name = value?.unit_name ? value?.unit_name : "";
                let lpo_price = value?.lpo_price ? value?.lpo_price : 0;
                let lpo_conversion = value?.conversion ? value?.conversion : 0;
                let lpo_quantity = value?.quantity ? value?.quantity : 0;
                let lpo_delivered = value?.delivered ? value?.delivered : 0;
                let lpo_free = value?.free ? value?.free : 0;
                let lpo_tax = value?.tax ? value?.tax : 0;
                let lpo_barcode = value?.barcode ? value?.barcode : "";
                let lpo_price_per_unit = 0;
                let lpo_sale_price = value?.sale_price ? value?.sale_price : 0;
                let lpo_expiry_date = value?.expiry_date
                  ? value?.expiry_date
                  : "";

                let price = parseFloat(lpo_quantity) * parseFloat(lpo_price);
                let tax_amount =
                  parseFloat(price) * (parseFloat(lpo_tax) / 100);

                let total = parseFloat(price) + parseFloat(tax_amount);

                console.log(lpo_price, "lpo_price");
                console.log(lpo_quantity, "lpo_quantity");
                console.log(price, "price");
                console.log(total, "total");

                let total_quantity =
                  parseFloat(lpo_quantity) + parseFloat(lpo_free);
                lpo_delivered =
                  parseFloat(lpo_delivered) <= parseFloat(total_quantity)
                    ? lpo_delivered
                    : total_quantity;
                lpo_price_per_unit =
                  parseFloat(total) / parseFloat(total_quantity);

                //delivery status count
                if (parseFloat(total_quantity) == parseFloat(lpo_delivered)) {
                  delivery_count++;
                }

                let selected_unit = "";
                let unit_ids = [];

                //unit details
                let lpo_unit_details_options = [];
                let unit_details_options = value?.unit_details_options;

                if (unit_details_options?.length > 0) {
                  if (selected_product?._id == value?.unit) {
                    const selectedDetails = await Promise.all(
                      unit_details_options?.map(async (v, index) => {
                        const selected_product_units_detail =
                          await product_units_details
                            ?.findById(v?._id)
                            ?.populate("name");

                        return {
                          name: selected_product_units_detail?.name?.name,
                          quantity: selected_product_units_detail?.quantity
                            ? selected_product_units_detail?.quantity
                            : 0,
                          lpo_price: lpo_price
                            ? parseFloat(lpo_price) / parseFloat(v?.conversion)
                            : 0,
                          price_per_unit: lpo_price_per_unit
                            ? parseFloat(lpo_price_per_unit) /
                              parseFloat(v?.conversion)
                            : 0,
                          conversion: v?.conversion ? v?.conversion : 0,
                          sale_price: v?.sale_price ? v?.sale_price : 0,
                          unit_quantity: total_quantity
                            ? parseFloat(v?.conversion) *
                              parseFloat(total_quantity)
                            : 0,
                          unit_delivered: lpo_delivered
                            ? parseFloat(v?.conversion) *
                              parseFloat(lpo_delivered)
                            : 0,
                        };
                      })
                    );
                    lpo_unit_details_options = [...selectedDetails];
                  } else {
                    for (value of unit_details_options) {
                      unit_ids?.push(value?._id);
                    }

                    if (unit_ids?.includes(value?.unit)) {
                      selected_unit =
                        unit_details_options?.[unit_ids?.indexOf(value?._id)];

                      lpo_unit = selected_unit?.name?.name;
                      lpo_conversion = selected_unit?.conversion;

                      if (
                        lpo_conversion &&
                        parseFloat(lpo_quantity) + parseFloat(lpo_free) >=
                          lpo_conversion
                      ) {
                        lpo_conversion = parseFloat(lpo_conversion) - 1;
                      }
                    }
                  }
                }

                const lpo_detail = new lpos_details({
                  lpo: lpo_save?._id,
                  description: selected_product?._id,
                  name: selected_product?.name,
                  unit: lpo_unit,
                  unit_name: lpo_unit_name,
                  lpo_price: lpo_price,
                  conversion: lpo_conversion,
                  quantity: lpo_quantity,
                  delivered: lpo_delivered,
                  free: lpo_free,
                  tax: lpo_tax,
                  barcode: lpo_barcode,
                  price_per_unit: lpo_price_per_unit,
                  sale_price: lpo_sale_price,
                  expiry_date: lpo_expiry_date,
                  tax_amount: tax_amount,
                  total: total,
                  status: status ? status : 0,
                  ref: authorize?.ref,
                  branch: branch ? branch : authorize?.branch,
                  created: new Date(),
                  created_by: authorize?.id,
                });

                const lpo_detail_save = await lpo_detail?.save();

                lpo_subtotal = parseFloat(lpo_subtotal) + parseFloat(price);
                lpo_taxamount =
                  parseFloat(lpo_taxamount) + parseFloat(tax_amount);
                lpo_total = parseFloat(lpo_total) + parseFloat(total);

                count++;
              }
            }

            console.log(lpo_total, "lpo_total");

            //total update
            if (count == details?.length) {
              const selected_lpo = await lpos?.findById(lpo_save?._id);

              if (selected_lpo) {
                //grand total
                let lpo_discount = 0;
                if (discount) {
                  if (discount <= lpo_total) {
                    lpo_discount = discount;
                  }
                }
                let lpo_delivery = delivery ? delivery : 0;

                let grand_total =
                  parseFloat(lpo_total) +
                  parseFloat(lpo_delivery) -
                  parseFloat(lpo_discount);

                selected_lpo.subtotal = lpo_subtotal ? lpo_subtotal : 0;
                selected_lpo.taxamount = lpo_taxamount ? lpo_taxamount : 0;
                selected_lpo.discount = lpo_discount ? lpo_discount : 0;

                console.log(grand_total, "grand_total");

                selected_lpo.total = grand_total ? grand_total : 0;

                const selected_lpo_save = await selected_lpo?.save();

                success_200(res, "Lpo order created");
              } else {
                failed_400("Lpo not found");
              }
            } else {
              failed_400(res, "Lpo failed");
            }
          } else {
            failed_400(res, "Details missing");
          }
        }
      }
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const fetchProducts = async (details) => {
  const productIds = details.map((detail) => detail.description);
  return products
    .find({ _id: { $in: productIds } })
    .populate({ path: "unit", match: { status: { $ne: 2 } } });
};

const calculateDetails = (detail, product, productUnitsDetails) => {
  const {
    lpo_price = 0,
    quantity = 0,
    tax = 0,
    free = 0,
    delivered = 0,
    unit_details_options = [],
  } = detail;

  const totalQuantity = parseFloat(quantity || 0) + parseFloat(free || 0);
  const price = parseFloat(quantity || 0) * parseFloat(lpo_price || 0);
  const taxAmount = parseFloat(price || 0) * (parseFloat(tax) / 100);
  const total = parseFloat(price || 0) + parseFloat(taxAmount || 0);

  const isMainUnit = detail.unit === product._id.toString();

  const inventoryProductUnit =
    productUnitsDetails?.filter((unit) => detail.unit == unit?._id) || [];

  const unitDetails = isMainUnit
    ? unit_details_options.map((unit) => {
        const conversion = parseFloat(unit?.conversion || 1);
        return {
          _id: unit?._id,
          inventory_unit: unit?.inventory_unit,
          name: unit?.name,
          quantity: parseFloat(unit?.quantity || 0),
          conversion: conversion,
          lpo_price:
            parseFloat(detail?.lpo_price || 0) / parseFloat(conversion || 0),
          price_per_unit:
            parseFloat(detail?.price_per_unit || 0) /
            parseFloat(conversion || 0),
          sale_price: parseFloat(unit?.sale_price || 0) || 0,
          unit_quantity: parseFloat(totalQuantity || 0) * conversion,
          unit_delivered: parseFloat(delivered || 0) * conversion,
        };
      })
    : inventoryProductUnit;

  const lpoDetails = {
    subtotal: price,
    taxAmount,
    total,
    isFullyDelivered: parseFloat(delivered) == totalQuantity,
    isMainUnit,
    unitDetails: unitDetails,
  };

  return lpoDetails;
};

const update_lpo = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const authorize = authorization(req);

    if (!authorize) return unauthorized(res);

    const {
      id,
      supplier,
      number,
      invoice,
      date,
      due_date,
      details,
      discount = 0,
      delivery = 0,
      status = 0,
      branch,
    } = req.body;

    if (!id || !supplier || !date || !due_date || !(details?.length > 0)) {
      return incomplete_400(res);
    }

    const lpoOrder = await lpos.findById(id);
    if (!lpoOrder || lpoOrder.status === 2) {
      return failed_400(res, "Lpo Order not found");
    }

    const assignedNumber = number || (await get_next_lpo(req, res, 1000));

    const existingOrder = await lpos.findOne({
      _id: { $ne: id },
      number: assignedNumber,
      status: 1,
      branch: branch || authorize.branch,
    });

    if (existingOrder) {
      return failed_400(res, "Lpo number exists");
    }

    const productsMap = (await fetchProducts(details)).reduce(
      (map, product) => {
        map[product._id] = product;
        return map;
      },
      {}
    );

    let subtotal = 0;
    let taxAmount = 0;
    let total = 0;
    let deliveryCount = 0;

    const inventoryUpdates = [];
    const inventoryUnitDetailsUpdates = [];
    const lpoOrderDetailsUpdates = [];
    const lpoOrderUnitDetailsUpdates = [];
    const paymentsUpdates = [];

    for (const detail of details) {
      const product = productsMap[detail.description];

      if (!product) continue;

      const productUnitsDetails = await product_units_details.find({
        product: product._id,
      });

      const {
        subtotal: itemSubtotal,
        taxAmount: itemTaxAmount,
        total: itemTotal,
        isFullyDelivered,
        isMainUnit,
        unitDetails,
      } = calculateDetails(detail, product, productUnitsDetails);

      subtotal += itemSubtotal;
      taxAmount += itemTaxAmount;
      total += itemTotal;

      if (isFullyDelivered) deliveryCount++;

      let new_number = await get_next_inventories(req, res, 1000);
      let assigned_innevtory_number = new_number;

      // update & create inventory
      let total_delivered = parseFloat(detail.delivered || 0);
      let current_stock = 0;
      let total_unit_delivered =
        parseFloat(detail?.delivered || 0) /
        parseFloat(detail?.conversion || 0);
      let current_sub_unit_stock = 0;

      if (detail.inventory) {
        // total stock calculation for existing stock (main unit)
        const selected_lpo_details = await lpos_details?.findOne({
          inventory: detail?.inventory,
          lpo: lpoOrder?._id,
        });

        const selected_inventory = await inventories?.findById(
          detail?.inventory
        );

        let previous_unit_stock = parseFloat(
          selected_lpo_details?.delivered || 0
        );

        current_stock =
          parseFloat(total_delivered || 0) -
          parseFloat(previous_unit_stock || 0);

        total_delivered =
          parseFloat(selected_inventory?.stock || 0) + current_stock;

        // total stock calculation for existing stock (sub unit)
        current_sub_unit_stock =
          parseFloat(detail?.delivered || 0) -
          parseFloat(previous_unit_stock || 0);

        let total_unit_stock =
          parseFloat(current_sub_unit_stock || 0) /
          parseFloat(detail?.conversion || 0);

        total_unit_delivered =
          parseFloat(selected_inventory?.stock || 0) +
          parseFloat(total_unit_stock || 0);
      }

      // update & create lpo order details
      const newlpoOrderDetailId =
        detail.inventory || new mongoose.Types.ObjectId();

      const lpoOrderUpdateData = detail.inventory
        ? //update lpo order details
          {
            description: product._id,
            name: detail.name,
            unit: detail.unit,
            unit_name: detail.unit_name,
            lpo_price: detail.lpo_price,
            conversion: detail.conversion,
            quantity: detail.quantity,
            delivered: detail.delivered,
            free: detail.free,
            tax: detail.tax,
            barcode: detail.barcode,
            price_per_unit: detail.price_per_unit,
            sale_price: detail.sale_price,
            expiry_date: detail.expiry_date,
            tax_amount: detail.tax_amount,
            quantity: detail.quantity,
            delivered: detail.delivered,
            tax: detail.tax,
            free: detail.free,
            total: itemTotal,
          }
        : // create lpo order details
          {
            _id: newlpoOrderDetailId,
            lpo: id,
            quote: detail?.quote,
            description: detail?.description,
            name: detail?.name,
            unit: detail?.unit,
            unit_name: detail?.unit_name,
            lpo_price: detail?.lpo_price,
            conversion: detail?.conversion,
            quantity: detail?.quantity,
            delivered: detail?.delivered,
            free: detail?.free,
            tax: detail?.tax,
            type: detail?.type,
            barcode: detail?.barcode,
            price_per_unit: detail?.price_per_unit,
            sale_price: detail?.sale_price,
            expiry_date: detail?.expiry_date,
            tax_amount: detail?.tax_amount,
            total: itemTotal,
            status: status ? status : 0,
            ref: authorize?.ref,
            branch: branch ? branch : authorize?.branch,
            created: new Date(),
            created_by: authorize?.id,
          };

      lpoOrderDetailsUpdates.push({
        updateOne: {
          filter: { inventory: newInventoryId },
          update: { $set: lpoOrderUpdateData },
          upsert: true,
        },
      });

      // update & create inventory & lpo order details units
      for (const unit of unitDetails) {
        if (detail.inventory) {
          // update inventory unit details
          const selected_inventory_detail =
            await inventories_units_details?.findOne({
              inventory: detail.inventory,
            });

          //sub unit stock calculation
          const total_sub_unit_delivered =
            parseFloat(selected_inventory_detail?.stock || 0) +
            parseFloat(current_sub_unit_stock || 0);

          //main unit stock calculation
          const current_unit_stock =
            parseFloat(current_stock || 0) * parseFloat(unit.conversion || 0);

          const total_unit_delivered =
            parseFloat(selected_inventory_detail?.stock || 0) +
            parseFloat(current_unit_stock || 0);

          // update lpo order unit details
          if (unit?._id != detail?.unit) {
            // product unit only
            const lpoOrderUnitUpdateData = {
              name: unit.name,
              quantity: unit.quantity,
              conversion: unit.conversion,
              unit_quantity: unit.unit_quantity,
              unit_delivered: unit.unit_delivered,
              price_per_unit: unit.price_per_unit,
              sale_price: unit.sale_price,
            };

            lpoOrderUnitDetailsUpdates.push({
              updateOne: {
                filter: { inventory_unit: unit.inventory_unit },
                update: {
                  $set: lpoOrderUnitUpdateData,
                },
                upsert: true,
              },
            });
          }
        } else {
          // create new lpo order unit details
          if (unit?._id != detail?.unit) {
            // product unit only
            const lpoOrderUnitUpdateData = {
              details: lpoOrderUpdateData?._id,
              name: unit.name,
              quantity: unit.quantity,
              lpo_price: unit?.price_per_unit,
              price_per_unit: unit.price_per_unit,
              sale_price: unit.sale_price,
              conversion: unit.conversion,
              unit_quantity: unit.unit_quantity,
              unit_delivered: unit.unit_delivered,
              status: status ? status : 0,
              ref: authorize?.ref,
              branch: branch ? branch : authorize?.branch,
              created: new Date(),
              created_by: authorize?.id,
            };

            lpoOrderUnitDetailsUpdates.push({
              updateOne: {
                filter: { inventory_unit: unit.inventory_unit },
                update: {
                  $set: lpoOrderUnitUpdateData,
                },
                upsert: true,
              },
            });
          }
        }
      }
    }

    // grand total calculation
    const grandTotal =
      parseFloat(total || 0) +
      parseFloat(delivery || 0) -
      parseFloat(discount || 0);

    await lpos_details.bulkWrite(lpoOrderDetailsUpdates, {
      session,
    });
    await lpos_units_details.bulkWrite(lpoOrderUnitDetailsUpdates, {
      session,
    });

    lpoOrder.set({
      supplier,
      number: assignedNumber,
      invoice: invoice,
      date,
      due_date,
      subtotal,
      taxamount: taxAmount,
      discount,
      delivery,
      total: grandTotal,
      status,
    });

    await lpoOrder.save({ session });
    await session.commitTransaction();
    session.endSession();

    success_200(res, "Lpo order updated.");
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    catch_400(res, err.message);
  }
};

const delete_lpo = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_lpo = await lpos?.findById(id);

        if (!selected_lpo || selected_lpo?.status == 2) {
          failed_400(res, "Lpo Order not found");
        } else {
          const lpo_log = new lpos_log({
            lpo: id,
            supplier: selected_lpo?.supplier,
            number: selected_lpo?.number,
            date: selected_lpo?.date,
            due_date: selected_lpo?.due_date,
            subtotal: selected_lpo?.subtotal,
            taxamount: selected_lpo?.taxamount,
            discount: selected_lpo?.discount,
            delivery: selected_lpo?.delivery,
            delivery_status: selected_lpo?.delivery_status,
            delivery_date: selected_lpo?.delivery_date,
            payment_status: selected_lpo?.payment_status,
            payment_types: selected_lpo?.payment_types,
            payments: selected_lpo?.payments,
            paid: selected_lpo?.paid,
            remaining: selected_lpo?.remaining,
            total: selected_lpo?.total,
            status: selected_lpo?.status,
            ref: selected_lpo?.ref,
            branch: selected_lpo?.branch,
            updated: new Date(),
            updated_by: authorize?.id,
          });
          const lpo_log_save = await lpo_log?.save();

          selected_lpo.status = 2;
          const delete_lpo = await selected_lpo?.save();

          const lpo_inventories = await inventories.updateMany(
            { lpo: id },
            { $set: { status: 2 } }
          );

          success_200(res, "Lpo Order deleted");
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_lpo = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_lpo = await lpos
          ?.findById(id)
          ?.populate("supplier")
          ?.populate("branch");

        if (!selected_lpo || selected_lpo?.status == 2) {
          failed_400(res, "Lpo Order not found");
        } else {
          const selected_lpo_details = await lpos_details
            ?.find({
              lpo: selected_lpo?._id,
            })
            ?.populate({
              path: "description",
              match: { status: { $ne: 2 } },
            });

          let lpo_details_and_units = [];

          for (value of selected_lpo_details) {
            let details = value?.toObject();

            const selected_lpo_details_units = await lpos_units_details
              ?.find({
                details: value?._id,
              })
              ?.sort({ created: 1 });

            lpo_details_and_units?.push({
              ...details,
              unit_details_options: selected_lpo_details_units,
            });
          }

          const lpoData = selected_lpo?.toObject();

          success_200(res, "", {
            ...lpoData,
            details: lpo_details_and_units,
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

const get_all_lpos = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (!authorize) {
      return unauthorized(res);
    }

    const {
      search,
      supplier,
      contractor,
      status,
      date,
      due_date,
      sort,
      page,
      limit,
    } = req?.body;

    const page_number = Number(page) || 1;
    const page_limit = Number(limit) || 10;

    const lposList = {
      branch: authorize?.branch,
      status: { $ne: 2 },
    };

    // Apply filters based on request body
    if (search) {
      lposList.$or = [{ number: { $regex: search, $options: "i" } }];
    }
    if (supplier) lposList.supplier = supplier;
    if (contractor) lposList.contractor = contractor;
    if (status == 0) lposList.status = status;

    if (date?.start && date?.end) {
      let startDate = new Date(date.start);
      startDate.setHours(0, 0, 0, 0);

      let endDate = new Date(date.end);
      endDate.setHours(23, 59, 59, 999);

      lposList.date = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    if (due_date?.start && due_date?.end) {
      let startDate = new Date(due_date.start);
      startDate.setHours(0, 0, 0, 0);

      let endDate = new Date(due_date.end);
      endDate.setHours(23, 59, 59, 999);

      lposList.due_date = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    // Set sorting options
    let sortOption = { created: -1 };
    if (sort == 0) {
      sortOption = { total: 1 };
    } else if (sort == 1) {
      sortOption = { total: -1 };
    }

    // Get total count for pagination metadata
    const totalCount = await lpos.countDocuments(lposList);

    // Fetch paginated data
    const paginated_lpos = await lpos
      .find(lposList)
      .sort(sortOption)
      .skip((page_number - 1) * page_limit)
      .limit(page_limit)
      .populate("supplier");

    const totalPages = Math.ceil(totalCount / page_limit);

    success_200(res, "", {
      currentPage: page_number,
      totalPages,
      totalCount,
      data: paginated_lpos,
    });
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_lpos_details = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { search, supplier, contractor, status, date, due_date, sort } =
        req?.body;

      const lposList = { branch: authorize?.branch };
      lposList.status = { $ne: 2 };

      // Apply filters based on request body
      search &&
        (lposList.$or = [{ number: { $regex: search, $options: "i" } }]);
      supplier && (lposList.supplier = supplier);
      contractor && (lposList.supplier = contractor);
      status == 0 && (lposList.status = status);

      // Set sorting options
      let sortOption = { created: -1 };
      if (sort == 0) {
        sortOption = { total: 1 };
      } else if (sort == 1) {
        sortOption = { total: -1 };
      }

      if (date?.start && date?.end) {
        lposList.date = {
          $gte: new Date(date?.start),
          $lte: new Date(date?.end),
        };
      }

      // due_date
      if (due_date?.start && due_date?.end) {
        lposList.due_date = {
          $gte: new Date(due_date?.start),
          $lte: new Date(due_date?.end),
        };
      }

      const all_lpos = await lpos_details.find(lposList).sort(sortOption);
      // ?.populate("supplier");

      success_200(res, "", all_lpos);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_lpo_details = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_lpo_detail = await lpos_details
          .find({ description: id, status: 1 })
          .populate({
            path: "lpo",
            match: { status: 1 },
            populate: { path: "supplier" },
          });

        selected_lpo_detail.sort((a, b) => {
          const dateA = new Date(a.lpo?.date);
          const dateB = new Date(b.lpo?.date);
          return dateB - dateA;
        });

        success_200(res, "", selected_lpo_detail);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_lpo,
  update_lpo,
  delete_lpo,
  get_lpo,
  get_all_lpos_details,
  get_all_lpos,
  get_all_lpo_details,
};
