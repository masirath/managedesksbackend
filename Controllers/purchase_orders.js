const { authorization } = require("../Global/authorization");
const {
  failed_400,
  unauthorized,
  catch_400,
  incomplete_400,
  success_200,
} = require("../Global/errors");
const purchase_orders = require("../Models/purchase_orders");
const { checknull } = require("../Global/checknull");
const products = require("../Models/products");
const purchase_orders_details = require("../Models/purchase_orders_details");
const purchase_orders_log = require("../Models/purchase_orders_log");
const purchase_orders_details_log = require("../Models/purchase_orders_details_log");
const inventories = require("../Models/inventories");
const product_units_details = require("../Models/product_units_details");
const purchase_orders_units_details = require("../Models/purchase_orders_units_details");
const purchase_orders_payments = require("../Models/purchase_orders_payments");
const inventories_units_details = require("../Models/inventories_units_details");
const purchase_orders_payments_log = require("../Models/purchase_orders_payments_log");
const purchase_orders_units_details_log = require("../Models/purchase_orders_units_details_log");
const inventories_log = require("../Models/inventories_log");
const inventories_units_details_log = require("../Models/inventories_units_details_log");
const { default: mongoose } = require("mongoose");

const get_next_purchase_order = async (req, res, number) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const total_purchase_order = await purchase_orders.countDocuments({
        branch: authorize?.branch,
      });

      const next_purchase_order_number = number + total_purchase_order;

      const existing_purchase_order_number = await purchase_orders.findOne({
        number: next_purchase_order_number,
        branch: authorize?.branch,
      });

      if (existing_purchase_order_number) {
        return await get_next_purchase_order(
          req,
          res,
          next_purchase_order_number
        );
      } else {
        return next_purchase_order_number;
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

const create_purchase_order = async (req, res) => {
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
      delivery_status,
      delivery_date,
      payment_status,
      payment_types,
      payments,
      status,
      branch,
    } = req?.body;

    const assigned_number =
      number || (await get_next_purchase_order(req, res, 1000));

    if (!supplier || !assigned_number || !date || !details?.length) {
      return incomplete_400(res);
    }

    const existing = await purchase_orders.findOne({
      number: assigned_number,
      branch: branch || authorize.branch,
      status: 1,
    });
    if (existing) return failed_400(res, "Purchase number exists");

    const purchase_order = new purchase_orders({
      supplier,
      number: assigned_number,
      invoice,
      date,
      due_date,
      subtotal: 0,
      taxamount: 0,
      discount: 0,
      delivery: 0,
      delivery_status: 0,
      delivery_date: "",
      payment_status: 0,
      total: 0,
      status: status || 0,
      ref: authorize.ref,
      branch: branch || authorize.branch,
      created: new Date(),
      created_by: authorize.id,
    });

    const purchase_order_save = await purchase_order.save();

    let subtotal = 0;
    let taxamount = 0;
    let total = 0;
    let delivery_count = 0;

    const inventoryList = [];
    const detailList = [];
    const unitDetailsList = [];
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
      const line_price = quantity * price;
      const tax_amt = (line_price * tax) / 100;
      const line_total = line_price + tax_amt;
      const total_qty = quantity + free;
      const delivered = Math.min(parseFloat(value.delivered || 0), total_qty);
      const price_per_unit = total_qty > 0 ? line_total / total_qty : 0;

      if (delivered === total_qty) delivery_count++;

      const inventory = {
        _id: new mongoose.Types.ObjectId(),
        number: value.batch || (await get_next_inventories(req, res, 1000)),
        purchase: purchase_order_save._id,
        supplier,
        product: value.description,
        purchase_price: purchase_price,
        price_per_unit,
        sale_price: value.sale_price,
        wholesale_price: value.wholesale_price,
        tax,
        stock: delivered,
        manufacture_date: value.manufacture_date,
        expiry_date: value.expiry_date,
        barcode: value.barcode,
        status: status || 0,
        ref: authorize.ref,
        branch: branch || authorize.branch,
        created: new Date(),
        created_by: authorize.id,
      };
      inventoryList.push(inventory);

      const detail = {
        _id: new mongoose.Types.ObjectId(),
        purchase: purchase_order_save._id,
        inventory: inventory._id,
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
        batch: inventory.number,
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
          const unitDetail = {
            _id: new mongoose.Types.ObjectId(),
            inventory: inventory._id,
            name: u.name,
            conversion: u.conversion,
            purchase_price: purchase_price / (u.conversion || 1),
            price_per_unit: price_per_unit / (u.conversion || 1),
            sale_price: u.sale_price,
            wholesale_price: u.wholesale_price,
            stock: delivered * (u.conversion || 1),
            status: status || 0,
            ref: authorize.ref,
            branch: branch || authorize.branch,
            created: new Date(),
            created_by: authorize.id,
          };
          unitDetailsList.push(unitDetail);

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

    await inventories.insertMany(inventoryList);
    await purchase_orders_details.insertMany(detailList);
    await inventories_units_details.insertMany(unitDetailsList);
    await purchase_orders_units_details.insertMany(unitRecordsList);

    let deliveryStat = 0;
    if (delivery_count === details.length) deliveryStat = 2;
    else if (delivery_count > 0) deliveryStat = 1;

    const discountAmount = Math.min(parseFloat(discount || 0), total);
    const deliveryCharge = parseFloat(delivery || 0);
    const grand_total = total + deliveryCharge - discountAmount;

    let paid = 0;
    let paymentDetails = [];
    const types = payment_types ? JSON.parse(payment_types) : [];
    const paymentVals = payments ? JSON.parse(payments) : {};

    for (const method of types) {
      const amount = parseFloat(paymentVals[method]?.amount || 0);
      paid += amount;
      paymentDetails.push({
        purchase: purchase_order_save._id,
        name: method,
        amount,
        status: status || 0,
        ref: authorize.ref,
        branch: branch || authorize.branch,
        created: new Date(),
        created_by: authorize.id,
      });
    }

    await purchase_orders_payments.insertMany(paymentDetails);

    const paymentStat = paid === grand_total ? 2 : paid > 0 ? 1 : 0;

    Object.assign(purchase_order_save, {
      subtotal,
      taxamount,
      discount: discountAmount,
      delivery: deliveryCharge,
      delivery_status: deliveryStat,
      delivery_date: deliveryStat ? delivery_date || new Date() : "",
      payment_status: paymentStat,
      total: grand_total,
    });

    await purchase_order_save.save();
    return success_200(res, "Purchase order created");
  } catch (errors) {
    return catch_400(res, errors?.message);
  }
};

const update_purchase_order = async (req, res) => {
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
      delivery_date,
      payments,
      payment_types,
      payment_status,
      status = 0,
      branch,
    } = req.body;

    if (!id || !supplier || !date || !(details?.length > 0)) {
      return incomplete_400(res);
    }

    const purchaseOrder = await purchase_orders.findById(id);
    if (!purchaseOrder || purchaseOrder.status === 2) {
      return failed_400(res, "Purchase Order not found");
    }

    const assignedNumber =
      number || (await get_next_purchase_order(req, res, 1000));

    const existingOrder = await purchase_orders.findOne({
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

    const inventoryUpdates = [];
    const inventoryUnitDetailsUpdates = [];
    const purchaseOrderDetailsUpdates = [];
    const purchaseOrderUnitDetailsUpdates = [];
    const paymentsUpdates = [];

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
              inventory_unit: u?.inventory_unit,
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

      let new_number = await get_next_inventories(req, res, 1000);
      let assigned_innevtory_number = detail.batch ? detail.batch : new_number;

      // update & create inventory
      let total_delivered = parseFloat(detail.delivered || 0);
      let current_stock = 0;
      let total_unit_delivered =
        parseFloat(detail?.delivered || 0) /
        parseFloat(detail?.conversion || 0);
      let current_sub_unit_stock = 0;

      if (detail.inventory) {
        // total stock calculation for existing stock (main unit)
        const selected_purchase_order_details =
          await purchase_orders_details?.findOne({
            inventory: detail?.inventory,
            purchase: purchaseOrder?._id,
          });

        const selected_inventory = await inventories?.findById(
          detail?.inventory
        );

        let previous_unit_stock = parseFloat(
          selected_purchase_order_details?.delivered || 0
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

      const newInventoryId = detail.inventory || new mongoose.Types.ObjectId();

      const inventoryUpdateData = detail.inventory
        ? // update inventory
          {
            number: assigned_innevtory_number,
            supplier: supplier,
            purchase_price: isMainUnit ? detail?.purchase_price : 0,
            price_per_unit: isMainUnit ? detail?.price_per_unit : 0,
            sale_price: isMainUnit ? detail?.sale_price : 0,
            wholesale_price: isMainUnit ? detail?.wholesale_price : 0,
            tax: isMainUnit ? detail?.tax : 0,
            stock: isMainUnit ? total_delivered : total_unit_delivered,
            expiry_date: isMainUnit ? detail?.expiry_date : "",
            barcode: isMainUnit ? detail?.barcode : "",
          }
        : // create inventory
          {
            _id: newInventoryId,
            number: assigned_innevtory_number,
            purchase: id,
            supplier: supplier,
            product: detail?.description,
            purchase_price: isMainUnit ? detail?.purchase_price : 0,
            price_per_unit: isMainUnit ? detail?.price_per_unit : 0,
            sale_price: isMainUnit ? detail?.sale_price : 0,
            wholesale_price: isMainUnit ? detail?.wholesale_price : 0,
            tax: isMainUnit ? detail?.tax : 0,
            stock: isMainUnit ? detail.delivered : total_unit_delivered,
            expiry_date: isMainUnit ? detail?.expiry_date : "",
            barcode: isMainUnit ? detail?.barcode : "",
            status: status ? status : 0,
            ref: authorize?.ref,
            branch: branch ? branch : authorize?.branch,
            created: new Date(),
            created_by: authorize?.id,
          };

      inventoryUpdates.push({
        updateOne: {
          filter: { _id: newInventoryId },
          update: { $set: inventoryUpdateData },
          upsert: true,
        },
      });

      // update & create purchase order details
      const newPurchaseOrderDetailId =
        detail.inventory || new mongoose.Types.ObjectId();

      const purchaseOrderUpdateData = detail.inventory
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
            purchase: id,
            inventory: inventoryUpdateData?._id,
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
          filter: { inventory: newInventoryId },
          update: { $set: purchaseOrderUpdateData },
          upsert: true,
        },
      });

      // update & create inventory & purchase order details units
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

          const inventoryUnitUpdateData =
            unit?._id == detail?.unit
              ? // sub unit
                {
                  name: detail?.unit_name,
                  conversion: detail.conversion,
                  purchase_price: detail.purchase_price,
                  price_per_unit: detail.price_per_unit,
                  sale_price: detail.sale_price,
                  wholesale_price: detail.wholesale_price
                    ? detail.wholesale_price
                    : 0,
                  stock: total_sub_unit_delivered,
                }
              : // product unit
                {
                  name: unit?.name,
                  conversion: unit.conversion,
                  purchase_price: unit.purchase_price,
                  price_per_unit: unit.price_per_unit,
                  sale_price: unit.sale_price,
                  wholesale_price: detail.wholesale_price
                    ? detail.wholesale_price
                    : 0,
                  stock: total_unit_delivered,
                };

          inventoryUnitDetailsUpdates.push({
            updateOne: {
              filter: { inventory: detail.inventory },
              update: { $set: inventoryUnitUpdateData },
              upsert: true,
            },
          });

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

          // create new inventory unit details
          const inventoryUnitUpdateData =
            unit?._id == detail?.unit
              ? // sub unit
                {
                  _id: newInventoryUnitId,
                  inventory: inventoryUpdateData?._id,
                  name: detail?.unit_name,
                  conversion: detail.conversion,
                  purchase_price: detail.purchase_price,
                  price_per_unit: detail.price_per_unit,
                  sale_price: detail.sale_price,
                  wholesale_price: detail.wholesale_price
                    ? detail.wholesale_price
                    : 0,
                  stock: detail.delivered,
                  status: status ? status : 0,
                  ref: authorize?.ref,
                  branch: branch ? branch : authorize?.branch,
                  created: new Date(),
                  created_by: authorize?.id,
                }
              : // product unit
                {
                  _id: newInventoryUnitId,
                  inventory: inventoryUpdateData?._id,
                  name: unit?.name,
                  conversion: unit.conversion,
                  purchase_price: unit.purchase_price,
                  price_per_unit: unit.price_per_unit,
                  sale_price: unit.sale_price,
                  wholesale_price: unit.wholesale_price
                    ? unit.wholesale_price
                    : 0,
                  stock: unit.unit_delivered,
                  status: status ? status : 0,
                  ref: authorize?.ref,
                  branch: branch ? branch : authorize?.branch,
                  created: new Date(),
                  created_by: authorize?.id,
                };

          inventoryUnitDetailsUpdates.push({
            updateOne: {
              filter: { inventory: detail.inventory },
              update: { $set: inventoryUnitUpdateData },
              upsert: true,
            },
          });

          // create new purchase order unit details
          if (unit?._id != detail?.unit) {
            // product unit only
            const purchaseOrderUnitUpdateData = {
              details: purchaseOrderUpdateData?._id,
              inventory_unit: inventoryUnitUpdateData?._id,
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
    const deliveryStatus =
      deliveryCount == details.length ? 2 : deliveryCount > 0 ? 1 : 0;

    await purchase_orders_payments.deleteMany({ purchase: id });
    const parsedTypes = payment_types ? JSON.parse(payment_types) : [];
    const parsedPayments = payments ? JSON.parse(payments) : {};
    let purchase_paid = 0;

    for (const value of parsedTypes) {
      const payment = parsedPayments[value];
      const amount = parseFloat(payment?.amount || 0);
      purchase_paid += amount;

      const paymentUpdate =
        // payment?.id ?
        //   {
        //       updateOne: {
        //         filter: { _id: payment.id },
        //         update: { $set: { name: value, amount } },
        //         upsert: false,
        //       },
        //     }
        //   :
        {
          insertOne: {
            document: {
              purchase: id,
              name: value,
              amount,
              status,
              ref: authorize?.ref,
              branch: branch || authorize?.branch,
              created: new Date(),
              created_by: authorize?.id,
            },
          },
        };

      paymentsUpdates.push(paymentUpdate);
    }

    const isPaidFull = purchase_paid.toFixed(3) == grandTotal.toFixed(3);
    const data_payment_status = isPaidFull ? 2 : purchase_paid > 0 ? 1 : 0;

    await inventories.bulkWrite(inventoryUpdates, { session });
    await inventories_units_details.bulkWrite(inventoryUnitDetailsUpdates, {
      session,
    });
    await purchase_orders_details.bulkWrite(purchaseOrderDetailsUpdates, {
      session,
    });
    await purchase_orders_units_details.bulkWrite(
      purchaseOrderUnitDetailsUpdates,
      { session }
    );
    await purchase_orders_payments.bulkWrite(paymentsUpdates, { session });

    console.log(paymentsUpdates, "purchase_orders_payments");

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
      delivery_status: deliveryStatus,
      delivery_date:
        deliveryStatus == 2 ? (delivery_date ? delivery_date : new Date()) : "",
      status,
      payment_status: data_payment_status,
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

const delete_purchase_order = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_purchase_order = await purchase_orders?.findById(id);

        if (!selected_purchase_order || selected_purchase_order?.status == 2) {
          failed_400(res, "Purchase Order not found");
        } else {
          const purchase_order_log = new purchase_orders_log({
            purchase: id,
            supplier: selected_purchase_order?.supplier,
            number: selected_purchase_order?.number,
            date: selected_purchase_order?.date,
            due_date: selected_purchase_order?.due_date,
            subtotal: selected_purchase_order?.subtotal,
            taxamount: selected_purchase_order?.taxamount,
            discount: selected_purchase_order?.discount,
            delivery: selected_purchase_order?.delivery,
            delivery_status: selected_purchase_order?.delivery_status,
            delivery_date: selected_purchase_order?.delivery_date,
            payment_status: selected_purchase_order?.payment_status,
            payment_types: selected_purchase_order?.payment_types,
            payments: selected_purchase_order?.payments,
            paid: selected_purchase_order?.paid,
            remaining: selected_purchase_order?.remaining,
            total: selected_purchase_order?.total,
            status: selected_purchase_order?.status,
            ref: selected_purchase_order?.ref,
            branch: selected_purchase_order?.branch,
            updated: new Date(),
            updated_by: authorize?.id,
          });
          const purchase_order_log_save = await purchase_order_log?.save();

          selected_purchase_order.status = 2;
          const delete_purchase_order = await selected_purchase_order?.save();

          const purchase_inventories = await inventories.updateMany(
            { purchase: id },
            { $set: { status: 2 } }
          );

          success_200(res, "Purchase Order deleted");
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_purchase_order = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_purchase_order = await purchase_orders
          ?.findById(id)
          ?.populate("supplier")
          ?.populate("branch");

        if (!selected_purchase_order || selected_purchase_order?.status == 2) {
          failed_400(res, "Purchase Order not found");
        } else {
          const selected_purchase_orders_payments =
            await purchase_orders_payments?.find({
              purchase: selected_purchase_order?._id,
              status: 1,
            });

          const selected_purchase_order_details = await purchase_orders_details
            ?.find({
              purchase: selected_purchase_order?._id,
            })
            ?.populate({
              path: "description",
              match: { status: { $ne: 2 } },
            });

          let purchase_order_details_and_units = [];

          for (value of selected_purchase_order_details) {
            let details = value?.toObject();

            const selected_purchase_order_details_units =
              await purchase_orders_units_details
                ?.find({
                  details: value?._id,
                })
                ?.sort({ created: 1 });

            purchase_order_details_and_units?.push({
              ...details,
              unit_details_options: selected_purchase_order_details_units,
            });
          }

          const purchaseData = selected_purchase_order?.toObject();

          success_200(res, "", {
            ...purchaseData,
            payments: selected_purchase_orders_payments,
            details: purchase_order_details_and_units,
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

const get_purchase_order_inventories = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_purchase_order = await purchase_orders
          ?.findById(id)
          ?.populate("supplier")
          ?.populate("branch");

        if (!selected_purchase_order || selected_purchase_order?.status == 2) {
          failed_400(res, "Purchase Order not found");
        } else {
          const selected_purchase_orders_payments =
            await purchase_orders_payments?.find({
              purchase: selected_purchase_order?._id,
            });

          const selected_purchase_order_details = await purchase_orders_details
            ?.find({
              purchase: selected_purchase_order?._id,
            })
            ?.populate({
              path: "description",
              match: { status: { $ne: 2 } },
            });

          let purchase_order_details_and_units = [];

          for (value of selected_purchase_order_details) {
            let details = value?.toObject();

            const selected_inventory = await inventories?.findOne({
              detail: value?._id,
            });

            const selected_purchase_order_details_units =
              await purchase_orders_units_details
                ?.find({
                  details: value?._id,
                })
                ?.sort({ created: 1 });

            purchase_order_details_and_units?.push({
              ...details,
              description: {
                _id: selected_inventory?._id,
                number: selected_inventory?.number,
                expiry_date: selected_inventory?.expiry_date,
                stock: selected_inventory?.stock,
              },
              unit_details_options: selected_purchase_order_details_units,
            });
          }

          const purchaseData = selected_purchase_order?.toObject();

          success_200(res, "", {
            ...purchaseData,
            payments: selected_purchase_orders_payments,
            details: purchase_order_details_and_units,
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

const get_all_purchase_orders = async (req, res) => {
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

    const purchase_ordersList = {
      branch: authorize?.branch,
      status: { $ne: 2 },
    };

    // Apply filters based on request body
    if (search) {
      purchase_ordersList.$or = [{ number: { $regex: search, $options: "i" } }];
    }
    if (supplier) purchase_ordersList.supplier = supplier;
    if (contractor) purchase_ordersList.contractor = contractor;
    if (status == 0) purchase_ordersList.status = status;

    if (date?.start && date?.end) {
      let startDate = new Date(date.start);
      startDate.setHours(0, 0, 0, 0);

      let endDate = new Date(date.end);
      endDate.setHours(23, 59, 59, 999);

      purchase_ordersList.date = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    if (due_date?.start && due_date?.end) {
      let startDate = new Date(due_date.start);
      startDate.setHours(0, 0, 0, 0);

      let endDate = new Date(due_date.end);
      endDate.setHours(23, 59, 59, 999);

      purchase_ordersList.due_date = {
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
    const totalCount = await purchase_orders.countDocuments(
      purchase_ordersList
    );

    // Fetch paginated data
    const paginated_purchase_orders = await purchase_orders
      .find(purchase_ordersList)
      .sort(sortOption)
      .skip((page_number - 1) * page_limit)
      .limit(page_limit)
      .populate("supplier");

    const totalPages = Math.ceil(totalCount / page_limit);

    success_200(res, "", {
      currentPage: page_number,
      totalPages,
      totalCount,
      data: paginated_purchase_orders,
    });
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_purchases_details = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { search, supplier, contractor, status, date, due_date, sort } =
        req?.body;

      const purchase_ordersList = { branch: authorize?.branch };
      purchase_ordersList.status = { $ne: 2 };

      // Apply filters based on request body
      search &&
        (purchase_ordersList.$or = [
          { number: { $regex: search, $options: "i" } },
        ]);
      supplier && (purchase_ordersList.supplier = supplier);
      contractor && (purchase_ordersList.supplier = contractor);
      status == 0 && (purchase_ordersList.status = status);

      // Set sorting options
      let sortOption = { created: -1 };
      if (sort == 0) {
        sortOption = { total: 1 };
      } else if (sort == 1) {
        sortOption = { total: -1 };
      }

      if (date?.start && date?.end) {
        purchase_ordersList.date = {
          $gte: new Date(date?.start),
          $lte: new Date(date?.end),
        };
      }

      // due_date
      if (due_date?.start && due_date?.end) {
        purchase_ordersList.due_date = {
          $gte: new Date(due_date?.start),
          $lte: new Date(due_date?.end),
        };
      }

      const all_purchase_orders = await purchase_orders_details
        .find(purchase_ordersList)
        .sort(sortOption);
      // ?.populate("supplier");

      success_200(res, "", all_purchase_orders);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_purchase_log = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_purchase_log = await purchases_log?.findById(id);

        if (!selected_purchase_log) {
          failed_400(res, "Purchase not found");
        } else {
          success_200(res, "", selected_purchase_log);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_purchases_log = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { purchase } = req?.body;

      if (!purchase) {
        incomplete_400(res);
      } else {
        const all_purchases_log = await purchases_log?.find({
          purchase: purchase,
        });
        success_200(res, "", all_purchases_log);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_purchase_details = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_purchase_order_detail = await purchase_orders_details
          .find({ description: id, status: 1 })
          .populate({
            path: "purchase",
            match: { status: 1 },
            populate: { path: "supplier" },
          });

        selected_purchase_order_detail.sort((a, b) => {
          const dateA = new Date(a.purchase?.date);
          const dateB = new Date(b.purchase?.date);
          return dateB - dateA;
        });

        success_200(res, "", selected_purchase_order_detail);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_purchase_order,
  update_purchase_order,
  delete_purchase_order,
  get_purchase_order,
  get_purchase_order_inventories,
  get_all_purchases_details,
  get_all_purchase_orders,
  get_all_purchase_details,
  get_purchase_log,
  get_all_purchases_log,
};
