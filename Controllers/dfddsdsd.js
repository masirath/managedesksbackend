// Dont make seperate funtion fetchProducts and calculateDetails use this inside update_purchase_order function ,  Optimized api and make speed api using bulk update

const fetchProducts = async (details) => {
  const productIds = details.map((detail) => detail.description);
  return products
    .find({ _id: { $in: productIds } })
    .populate({ path: "unit", match: { status: { $ne: 2 } } });
};

const calculateDetails = (detail, product, productUnitsDetails) => {
  const {
    purchase_price = 0,
    discount_price = 0,
    quantity = 0,
    tax = 0,
    free = 0,
    delivered = 0,
    unit_details_options = [],
  } = detail;

  const invoice_purchase_price =
    parseFloat(purchase_price || 0) - parseFloat(discount_price || 0);

  const totalQuantity = parseFloat(quantity || 0) + parseFloat(free || 0);
  const price =
    parseFloat(quantity || 0) * parseFloat(invoice_purchase_price || 0);
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
          purchase_price:
            parseFloat(detail?.purchase_price || 0) /
            parseFloat(conversion || 0),
          price_per_unit:
            parseFloat(detail?.price_per_unit || 0) /
            parseFloat(conversion || 0),
          sale_price: parseFloat(unit?.sale_price || 0) || 0,
          unit_quantity: parseFloat(totalQuantity || 0) * conversion,
          unit_delivered: parseFloat(delivered || 0) * conversion,
        };
      })
    : inventoryProductUnit;

  const purchaseDetails = {
    subtotal: price,
    taxAmount,
    total,
    isFullyDelivered: parseFloat(delivered) == totalQuantity,
    isMainUnit,
    unitDetails: unitDetails,
  };

  return purchaseDetails;
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

    if (
      !id ||
      !supplier ||
      !date ||
      //  !due_date ||
      !(details?.length > 0)
    ) {
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

      //copy starts

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
            discount_price: detail.discount_price,
            discount_percentage: detail.discount_percentage,
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
            discount_price: detail.discount_price,
            discount_percentage: detail.discount_percentage,
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

      //copy ends
    }

    // grand total calculation
    const grandTotal =
      parseFloat(total || 0) +
      parseFloat(delivery || 0) -
      parseFloat(discount || 0);

    //delivery status check
    const deliveryStatus =
      deliveryCount == details.length ? 2 : deliveryCount > 0 ? 1 : 0;

    const purchase_payments_delete = await purchase_orders_payments?.deleteMany(
      { purchase: id }
    );

    //payments create & update
    let purchase_payment_types = payment_types
      ? JSON?.parse(payment_types)
      : "";
    let purchase_payments = payments ? JSON?.parse(payments) : "";

    let purchase_paid = 0;
    // let purchase_order_payment_details = [];
    if (purchase_payment_types?.length > 0) {
      for (value of purchase_payment_types) {
        let purchase_payment_id = purchase_payments[value]?.id
          ? purchase_payments[value]?.id
          : null;
        let purchase_payment_amount = purchase_payments[value]?.amount
          ? parseFloat(purchase_payments[value]?.amount)
          : 0;

        purchase_paid =
          parseFloat(purchase_paid) + parseFloat(purchase_payment_amount);

        //payment create & update
        const paymentUpdateData = purchase_payment_id
          ? //update
            {
              name: value,
              amount: purchase_payment_amount,
            }
          : //create
            {
              purchase: id,
              name: value,
              amount: purchase_payment_amount,
              status: status ? status : 0,
              ref: authorize?.ref,
              branch: branch ? branch : authorize?.branch,
              created: new Date(),
              created_by: authorize?.id,
            };

        if (purchase_payment_id) {
          paymentsUpdates.push({
            updateOne: {
              filter: { _id: purchase_payment_id },
              update: { $set: paymentUpdateData },
              upsert: false,
            },
          });
        } else {
          paymentsUpdates.push({
            insertOne: { document: paymentUpdateData },
          });
        }
      }
    }

    //payment status check
    let data_payment_status = payment_status
      ? parseFloat(payment_status || 0)
      : 0;

    // if (parseFloat(data_payment_status) == 2) {
    if (
      parseFloat(purchase_paid?.toFixed(3) || 0) ==
      parseFloat(grandTotal?.toFixed(3) || 0)
    ) {
      data_payment_status = 2;
    } else if (
      parseFloat(purchase_paid) > 0 &&
      parseFloat(purchase_paid) < parseFloat(grandTotal)
    ) {
      data_payment_status = 1;
    } else {
      data_payment_status = 0;
    }
    // }

    //Perform bulk database operations
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
    await purchase_orders_payments.bulkWrite(paymentsUpdates, {
      session,
    });

    purchaseOrder.set({
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
