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
    if (!authorize) return unauthorized(res);

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

    const assigned_number = number || (await get_next_lpo(req, res, 1000));

    if (!supplier || !assigned_number || !date || !details?.length) {
      return incomplete_400(res);
    }

    const existing = await lpos.findOne({
      number: assigned_number,
      branch: branch || authorize.branch,
      status: 1,
    });
    if (existing) return failed_400(res, "Lpo number exists");

    const lpo = new lpos({
      supplier,
      number: assigned_number,
      invoice,
      date,
      due_date,
      subtotal: 0,
      taxamount: 0,
      discount: 0,
      delivery: 0,
      total: 0,
      status: status || 0,
      ref: authorize.ref,
      branch: branch || authorize.branch,
      created: new Date(),
      created_by: authorize.id,
    });

    const lpo_save = await lpo.save();

    let subtotal = 0;
    let taxamount = 0;
    let total = 0;
    let delivery_count = 0;

    const detailList = [];
    const unitRecordsList = [];

    for (const value of details) {
      const product = await products
        .findById(value.description)
        .populate({ path: "unit", match: { status: { $ne: 2 } } });
      if (!product) continue;

      const quantity = parseFloat(value.quantity || 0);
      const free = parseFloat(value.free || 0);
      const tax = parseFloat(value.tax || 0);
      const discount_price = parseFloat(value.discount_price || 0);
      const purchase_price = parseFloat(value.purchase_price || 0);
      const price = parseFloat(value.purchase_price || 0) - discount_price;
      const line_price = parseFloat(quantity || 0) * parseFloat(price || 0);
      const tax_amt =
        (parseFloat(line_price || 0) * parseFloat(tax || 0)) / 100;
      const line_total = parseFloat(line_price || 0) + parseFloat(tax_amt || 0);
      const total_qty = parseFloat(quantity || 0) + parseFloat(free || 0);
      const delivered = Math.min(parseFloat(value.delivered || 0), total_qty);
      const price_per_unit = total_qty > 0 ? line_total / total_qty : 0;

      console.log(line_total, "line_total");

      if (delivered === total_qty) delivery_count++;
      const detail = {
        _id: new mongoose.Types.ObjectId(),
        lpo: lpo_save._id,
        description: product._id,
        name: product.name,
        unit: value.unit,
        unit_name: value.unit_name,
        purchase_price: purchase_price,
        conversion: value.conversion,
        quantity,
        delivered,
        discount_price,
        discount_percentage: parseFloat(value.discount_percentage || 0),
        free,
        tax,
        barcode: value.barcode,
        batch: "",
        price_per_unit,
        sale_price: value.sale_price,
        wholesale_price: value.wholesale_price,
        expiry_date: value.expiry_date,
        tax_amount: tax_amt,
        total: line_total,
        status: status || 0,
        ref: authorize.ref,
        branch: branch || authorize.branch,
        created: new Date(),
        created_by: authorize.id,
      };
      detailList.push(detail);

      if (value.unit_details_options?.length) {
        for (const u of value.unit_details_options) {
          const unitRecord = {
            details: detail._id,
            inventory_unit: unitDetail._id,
            name: u.name,
            quantity: u.quantity,
            purchase_price: purchase_price / (u.conversion || 1),
            price_per_unit: price_per_unit / (u.conversion || 1),
            sale_price: u.sale_price,
            wholesale_price: u.wholesale_price,
            conversion: u.conversion,
            unit_quantity: u.conversion * total_qty,
            unit_delivered: u.conversion * delivered,
            status: status || 0,
            ref: authorize.ref,
            branch: branch || authorize.branch,
            created: new Date(),
            created_by: authorize.id,
          };
          unitRecordsList.push(unitRecord);
        }
      }

      subtotal += line_price;
      taxamount += tax_amt;
      total += line_total;
    }

    await lpos_details.insertMany(detailList);
    await lpos_units_details.insertMany(unitRecordsList);

    const discountAmount = Math.min(parseFloat(discount || 0), total);
    const deliveryCharge = parseFloat(delivery || 0);
    const grand_total = total + deliveryCharge - discountAmount;

    Object.assign(lpo_save, {
      subtotal,
      taxamount,
      discount: discountAmount,
      delivery: deliveryCharge,
      total: grand_total,
    });

    await lpo_save.save();
    return success_200(res, "Lpo order created");
  } catch (errors) {
    return catch_400(res, errors?.message);
  }
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

    if (!id || !supplier || !date || !(details?.length > 0)) {
      return incomplete_400(res);
    }

    const purchaseOrder = await lpos.findById(id);
    if (!purchaseOrder || purchaseOrder.status === 2) {
      return failed_400(res, "Purchase Order not found");
    }

    const assignedNumber = number || (await get_next_lpo(req, res, 1000));

    const existingOrder = await lpos.findOne({
      _id: { $ne: id },
      number: assignedNumber,
      status: 1,
      branch: branch || authorize.branch,
    });

    if (existingOrder) {
      return failed_400(res, "Purchase number exists");
    }

    const productIds = details.map((d) => d.description);
    const productList = await products
      .find({ _id: { $in: productIds } })
      .populate({
        path: "unit",
        match: { status: { $ne: 2 } },
      });

    const productsMap = productList.reduce((map, prod) => {
      map[prod._id.toString()] = prod;
      return map;
    }, {});

    let subtotal = 0;
    let taxAmount = 0;
    let total = 0;
    let deliveryCount = 0;

    const purchaseOrderDetailsUpdates = [];
    const purchaseOrderUnitDetailsUpdates = [];

    for (const detail of details) {
      const product = productsMap[detail.description];
      if (!product) continue;

      const productUnitsDetails = await product_units_details.find({
        product: product._id,
      });

      const {
        purchase_price = 0,
        discount_price = 0,
        quantity = 0,
        tax = 0,
        free = 0,
        delivered = 0,
        unit_details_options = [],
        unit,
      } = detail;

      const invoice_purchase_price =
        parseFloat(purchase_price || 0) - parseFloat(discount_price || 0);
      const totalQuantity = parseFloat(quantity || 0) + parseFloat(free || 0);
      const price =
        parseFloat(quantity || 0) * parseFloat(invoice_purchase_price || 0);
      const taxAmt = price * (parseFloat(tax || 0) / 100);
      const itemTotal = parseFloat(price || 0) + parseFloat(taxAmt || 0);
      const isMainUnit = unit === product._id.toString();

      const unitDetails = isMainUnit
        ? unit_details_options.map((u) => {
            const conv = parseFloat(u?.conversion || 1);
            return {
              _id: u?._id,
              // inventory_unit: u?.inventory_unit,
              name: u?.name,
              quantity: parseFloat(u?.quantity || 0),
              conversion: conv,
              purchase_price: purchase_price / conv,
              price_per_unit: detail?.price_per_unit / conv,
              sale_price: parseFloat(u?.sale_price || 0),
              unit_quantity: totalQuantity * conv,
              unit_delivered: parseFloat(delivered) * conv,
            };
          })
        : productUnitsDetails.filter((u) => u?._id == unit);

      subtotal += price;
      taxAmount += taxAmt;
      total += itemTotal;
      if (parseFloat(delivered) == totalQuantity) deliveryCount++;

      // update & create purchase order details
      const newPurchaseOrderDetailId =
        detail.inventory || new mongoose.Types.ObjectId();

      const purchaseOrderUpdateData = detail.lpo
        ? //update purchase order details
          {
            description: product._id,
            name: detail.name,
            unit: detail.unit,
            unit_name: detail.unit_name,
            purchase_price: detail.purchase_price,
            conversion: detail.conversion,
            quantity: detail.quantity,
            delivered: detail.delivered,
            discount_price: parseFloat(detail.discount_price || 0),
            discount_percentage: parseFloat(detail.discount_percentage || 0),
            free: detail.free,
            tax: detail.tax,
            barcode: detail.barcode,
            batch: detail.batch,
            price_per_unit: detail.price_per_unit,
            sale_price: detail.sale_price,
            wholesale_price: detail.wholesale_price,
            expiry_date: detail.expiry_date,
            tax_amount: detail.tax_amount,
            quantity: detail.quantity,
            delivered: detail.delivered,
            tax: detail.tax,
            free: detail.free,
            total: itemTotal,
          }
        : // create purchase order details
          {
            _id: newPurchaseOrderDetailId,
            lpo: id,
            description: detail?.description,
            name: detail?.name,
            unit: detail?.unit,
            unit_name: detail?.unit_name,
            purchase_price: detail?.purchase_price,
            conversion: detail?.conversion,
            quantity: detail?.quantity,
            delivered: detail?.delivered,
            discount_price: parseFloat(detail.discount_price || 0),
            discount_percentage: parseFloat(detail.discount_percentage || 0),
            free: detail?.free,
            tax: detail?.tax,
            type: detail?.type,
            barcode: detail?.barcode,
            batch: detail.batch,
            price_per_unit: detail?.price_per_unit,
            sale_price: detail?.sale_price,
            wholesale_price: detail?.wholesale_price,
            expiry_date: detail?.expiry_date,
            tax_amount: detail?.tax_amount,
            total: itemTotal,
            status: status ? status : 0,
            ref: authorize?.ref,
            branch: branch ? branch : authorize?.branch,
            created: new Date(),
            created_by: authorize?.id,
          };

      purchaseOrderDetailsUpdates.push({
        updateOne: {
          filter: { lpo: detail.lpo },
          update: { $set: purchaseOrderUpdateData },
          upsert: true,
        },
      });

      // update & create inventory & purchase order details units
      for (const unit of unitDetails) {
        if (detail.inventory) {
          // update purchase order unit details
          if (unit?._id != detail?.unit) {
            // product unit only
            const purchaseOrderUnitUpdateData = {
              name: unit.name,
              quantity: unit.quantity,
              conversion: unit.conversion,
              unit_quantity: unit.unit_quantity,
              unit_delivered: unit.unit_delivered,
              price_per_unit: unit.price_per_unit,
              sale_price: unit.sale_price,
              wholesale_price: unit.wholesale_price ? unit.wholesale_price : 0,
            };

            purchaseOrderUnitDetailsUpdates.push({
              updateOne: {
                filter: { inventory_unit: unit.inventory_unit },
                update: {
                  $set: purchaseOrderUnitUpdateData,
                },
                upsert: true,
              },
            });
          }
        } else {
          const newInventoryUnitId = new mongoose.Types.ObjectId();

          // create new purchase order unit details
          if (unit?._id != detail?.unit) {
            // product unit only
            const purchaseOrderUnitUpdateData = {
              details: purchaseOrderUpdateData?._id,
              name: unit.name,
              quantity: unit.quantity,
              purchase_price: unit?.price_per_unit,
              price_per_unit: unit.price_per_unit,
              sale_price: unit.sale_price,
              wholesale_price: unit.wholesale_price ? unit.wholesale_price : 0,
              conversion: unit.conversion,
              unit_quantity: unit.unit_quantity,
              unit_delivered: unit.unit_delivered,
              status: status ? status : 0,
              ref: authorize?.ref,
              branch: branch ? branch : authorize?.branch,
              created: new Date(),
              created_by: authorize?.id,
            };

            purchaseOrderUnitDetailsUpdates.push({
              updateOne: {
                filter: { inventory_unit: unit.inventory_unit },
                update: {
                  $set: purchaseOrderUnitUpdateData,
                },
                upsert: true,
              },
            });
          }
        }
      }
    }

    const grandTotal =
      parseFloat(total || 0) +
      parseFloat(delivery || 0) -
      parseFloat(discount || 0);

    await lpos_details.bulkWrite(purchaseOrderDetailsUpdates, {
      session,
    });
    await lpos_units_details.bulkWrite(purchaseOrderUnitDetailsUpdates, {
      session,
    });

    purchaseOrder.set({
      supplier,
      number: assignedNumber,
      invoice,
      date,
      due_date,
      subtotal,
      taxamount: taxAmount,
      discount,
      delivery,
      total: grandTotal,
      // delivery_status: deliveryStatus,
      // delivery_date:
      //   deliveryStatus == 2 ? (delivery_date ? delivery_date : new Date()) : "",
      status,
      // payment_status: data_payment_status,
    });

    await purchaseOrder.save({ session });
    await session.commitTransaction();
    session.endSession();

    success_200(res, "Purchase order updated.");
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
