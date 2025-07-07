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
// Add these to your existing requires
const ManualJournal = require("../Models/ManualJournal");
const Account = require("../Models/Account");

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
        delivery_status,
        delivery_date,
        payment_status,
        payment_types,
        payments,
        status,
        branch,
      } = req?.body;

      let new_number = await get_next_purchase_order(req, res, 1000);
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
        const selected_purchase_number = await purchase_orders?.findOne({
          number: assigned_number,
          branch: branch ? branch : authorize?.branch,
          status: 1,
        });

        if (selected_purchase_number) {
          failed_400(res, "Purchase number exists");
        } else {
          //create purchase order
          const purchase_order = new purchase_orders({
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

          const purchase_order_save = await purchase_order?.save();

          //purchase order details
          let purchase_subtotal = 0;
          let purchase_taxamount = 0;
          let purchase_total = 0;
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
                let purchase_unit = value?.unit ? value?.unit : "";
                let purchase_unit_name = value?.unit_name
                  ? value?.unit_name
                  : "";
                let purchase_price = value?.purchase_price
                  ? value?.purchase_price
                  : 0;
                let purchase_conversion = value?.conversion
                  ? value?.conversion
                  : 0;
                let purchase_quantity = value?.quantity ? value?.quantity : 0;
                let purchase_delivered = value?.delivered
                  ? value?.delivered
                  : 0;
                let purchase_free = value?.free ? value?.free : 0;
                let purchase_tax = value?.tax ? value?.tax : 0;
                let purchase_barcode = value?.barcode ? value?.barcode : "";
                let purchase_price_per_unit = 0;
                let purchase_sale_price = value?.sale_price
                  ? value?.sale_price
                  : 0;
                let purchase_expiry_date = value?.expiry_date
                  ? value?.expiry_date
                  : "";

                let price =
                  parseFloat(purchase_quantity) * parseFloat(purchase_price);
                let tax_amount =
                  parseFloat(price) * (parseFloat(purchase_tax) / 100);
                let total = parseFloat(price) + parseFloat(tax_amount);

                let total_quantity =
                  parseFloat(purchase_quantity) + parseFloat(purchase_free);
                purchase_delivered =
                  parseFloat(purchase_delivered) <= parseFloat(total_quantity)
                    ? purchase_delivered
                    : total_quantity;
                purchase_price_per_unit =
                  parseFloat(total) / parseFloat(total_quantity);

                //delivery status count
                if (
                  parseFloat(total_quantity) == parseFloat(purchase_delivered)
                ) {
                  delivery_count++;
                }

                let selected_unit = "";
                let unit_ids = [];

                //unit details
                let purchase_unit_details_options = [];
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
                          purchase_price: purchase_price
                            ? parseFloat(purchase_price) /
                              parseFloat(v?.conversion)
                            : 0,
                          price_per_unit: purchase_price_per_unit
                            ? parseFloat(purchase_price_per_unit) /
                            parseFloat(v?.conversion)
                            : 0,
                          conversion: v?.conversion ? v?.conversion : 0,
                          sale_price: v?.sale_price ? v?.sale_price : 0,
                          unit_quantity: total_quantity
                            ? parseFloat(v?.conversion) *
                            parseFloat(total_quantity)
                            : 0,
                          unit_delivered: purchase_delivered
                            ? parseFloat(v?.conversion) *
                            parseFloat(purchase_delivered)
                            : 0,
                        };
                      })
                    );
                    purchase_unit_details_options = [...selectedDetails];
                  } else {
                    for (value of unit_details_options) {
                      unit_ids?.push(value?._id);
                    }

                    if (unit_ids?.includes(value?.unit)) {
                      selected_unit =
                        unit_details_options?.[unit_ids?.indexOf(value?._id)];

                      purchase_unit = selected_unit?.name?.name;
                      purchase_conversion = selected_unit?.conversion;

                      if (
                        purchase_conversion &&
                        parseFloat(purchase_quantity) +
                        parseFloat(purchase_free) >=
                        purchase_conversion
                      ) {
                        purchase_conversion =
                          parseFloat(purchase_conversion) - 1;
                      }
                    }
                  }
                }

                //inventories create
                let new_number = await get_next_inventories(req, res, 1000);
                let assigned_innevtory_number = new_number;

                const selected_inventory_number = await inventories?.findOne({
                  number: assigned_innevtory_number,
                  branch: authorize?.branch,
                });

                if (selected_inventory_number) {
                  failed_400(res, "Inventory  exists");
                } else {
                  const selected_product_units_detail =
                    await product_units_details?.find({
                      product: selected_product?._id,
                    });

                  let inventory_purchase_price = value?.purchase_price
                    ? value?.purchase_price
                    : 0;
                  let inventory_price_per_unit = value?.price_per_unit
                    ? value?.price_per_unit
                    : 0;
                  let inventory_sale_price = value?.sale_price
                    ? value?.sale_price
                    : 0;
                  let inventory_tax = value?.tax ? value?.tax : 0;
                  let inventory_stock = value?.delivered ? value?.delivered : 0;
                  let inventory_unit_details_options =
                    purchase_unit_details_options;

                  if (selected_product?._id == value?.unit) {
                    inventory_purchase_price = inventory_purchase_price;
                    inventory_sale_price = inventory_sale_price;
                    inventory_tax = inventory_tax;
                    inventory_stock = inventory_stock;
                    inventory_price_per_unit = inventory_price_per_unit;
                    inventory_unit_details_options =
                      inventory_unit_details_options;
                  } else {
                    inventory_purchase_price = 0;
                    inventory_price_per_unit = 0;
                    inventory_sale_price = 0;
                    inventory_tax = inventory_tax;
                    inventory_stock =
                      parseFloat(value?.delivered || 0) /
                      parseFloat(value?.conversion || 0);
                    inventory_unit_details_options =
                      selected_product_units_detail;
                  }

                  const inventory = new inventories({
                    number: assigned_innevtory_number,
                    purchase: purchase_order_save?._id,
                    supplier: supplier,
                    product: value?.description,
                    purchase_price: inventory_purchase_price,
                    price_per_unit: inventory_price_per_unit,
                    sale_price: inventory_sale_price,
                    tax: inventory_tax,
                    stock: inventory_stock,
                    manufacture_date: value?.manufacture_date,
                    expiry_date: value?.expiry_date,
                    barcode: value?.barcode,
                    status: status ? status : 0,
                    ref: authorize?.ref,
                    branch: branch ? branch : authorize?.branch,
                    created: new Date(),
                    created_by: authorize?.id,
                  });
                  const inventory_save = await inventory?.save();

                  //purchase order details
                  const purchase_order_detail = new purchase_orders_details({
                    purchase: purchase_order_save?._id,
                    inventory: inventory_save?._id,
                    description: selected_product?._id,
                    name: selected_product?.name,
                    unit: purchase_unit,
                    unit_name: purchase_unit_name,
                    purchase_price: purchase_price,
                    conversion: purchase_conversion,
                    quantity: purchase_quantity,
                    delivered: purchase_delivered,
                    free: purchase_free,
                    tax: purchase_tax,
                    barcode: purchase_barcode,
                    price_per_unit: purchase_price_per_unit,
                    sale_price: purchase_sale_price,
                    expiry_date: purchase_expiry_date,
                    tax_amount: tax_amount,
                    total: total,
                    status: status ? status : 0,
                    ref: authorize?.ref,
                    branch: branch ? branch : authorize?.branch,
                    created: new Date(),
                    created_by: authorize?.id,
                  });

                  const purchase_order_detail_save =
                    await purchase_order_detail?.save();

                  //inventory units details
                  if (inventory_unit_details_options?.length > 0) {
                    for (v of inventory_unit_details_options) {
                      if (v?._id == value?.unit) {
                        const inventories_units_detail =
                          new inventories_units_details({
                            inventory: inventory_save?._id,
                            name: value?.unit_name,
                            conversion: value?.conversion,
                            purchase_price: value?.purchase_price,
                            price_per_unit: value?.price_per_unit,
                            sale_price: value?.sale_price,
                            stock: value?.delivered,
                            status: status ? status : 0,
                            ref: authorize?.ref,
                            branch: branch ? branch : authorize?.branch,
                            created: new Date(),
                            created_by: authorize?.id,
                          });

                        const inventories_units_detail_save =
                          await inventories_units_detail?.save();
                      } else {
                        const inventories_units_detail =
                          new inventories_units_details({
                            inventory: inventory_save?._id,
                            name: v?.name,
                            conversion: v?.conversion,
                            purchase_price: v?.purchase_price,
                            price_per_unit: v?.price_per_unit,
                            sale_price: v?.sale_price,
                            stock: v?.unit_delivered,
                            status: status ? status : 0,
                            ref: authorize?.ref,
                            branch: branch ? branch : authorize?.branch,
                            created: new Date(),
                            created_by: authorize?.id,
                          });

                        const inventories_units_detail_save =
                          await inventories_units_detail?.save();

                        //purchase order unit details
                        const purchase_order_unit_detail =
                          new purchase_orders_units_details({
                            details: purchase_order_detail_save?._id,
                            inventory_unit: inventories_units_detail_save?._id,
                            name: v?.name,
                            quantity: v?.quantity,
                            purchase_price: v?.purchase_price,
                            price_per_unit: v?.price_per_unit,
                            sale_price: v?.sale_price,
                            conversion: v?.conversion,
                            unit_quantity: v?.unit_quantity,
                            unit_delivered: v?.unit_delivered,
                            status: status ? status : 0,
                            ref: authorize?.ref,
                            branch: branch ? branch : authorize?.branch,
                            created: new Date(),
                            created_by: authorize?.id,
                          });

                        const purchase_order_unit_detail_save =
                          purchase_order_unit_detail?.save();
                      }
                    }
                  }
                }

                purchase_subtotal =
                  parseFloat(purchase_subtotal) + parseFloat(price);
                purchase_taxamount =
                  parseFloat(purchase_taxamount) + parseFloat(tax_amount);
                purchase_total = parseFloat(purchase_total) + parseFloat(total);

                count++;
              }
            }

            //total update
            if (count == details?.length) {
              const selected_purchase_order = await purchase_orders?.findById(
                purchase_order_save?._id
              );

              if (selected_purchase_order) {
                //delivery status
                let data_delivery_status = delivery_status
                  ? parseFloat(delivery_status || 0)
                  : 0;
                let data_delivery_date = delivery_date
                  ? delivery_date
                  : new Date();

                // if (parseFloat(data_delivery_status) == 2) {
                if (parseFloat(delivery_count) == details?.length) {
                  data_delivery_status = 2;
                } else if (
                  parseFloat(delivery_count) > 0 &&
                  parseFloat(delivery_count) < details?.length
                ) {
                  data_delivery_status = 1;
                  data_delivery_date = "";
                } else {
                  data_delivery_status = 0;
                  data_delivery_date = "";
                }
                // }

                //grand total
                let purchase_discount = 0;
                if (discount) {
                  if (discount <= purchase_total) {
                    purchase_discount = discount;
                  }
                }
                let purchase_delivery = delivery ? delivery : 0;

                let grand_total =
                  parseFloat(purchase_total) +
                  parseFloat(purchase_delivery) -
                  parseFloat(purchase_discount);

                //payment status
                let purchase_payment_types = payment_types
                  ? JSON?.parse(payment_types)
                  : "";
                let purchase_payments = payments ? JSON?.parse(payments) : "";

                let purchase_paid = 0;
                let purchase_order_payment_details = [];
                if (purchase_payment_types?.length > 0) {
                  for (value of purchase_payment_types) {
                    let purchase_payment_id = purchase_payments[value]?.id
                      ? purchase_payments[value]?.id
                      : "";
                    let purchase_payment_amount = purchase_payments[value]
                      ?.amount
                      ? parseFloat(purchase_payments[value]?.amount)
                      : 0;

                    purchase_paid =
                      parseFloat(purchase_paid) +
                      parseFloat(purchase_payment_amount);

                    purchase_order_payment_details?.push({
                      id: purchase_payment_id,
                      name: value,
                      amount: purchase_payment_amount,
                    });
                  }
                }

                let data_payment_status = payment_status
                  ? parseFloat(payment_status || 0)
                  : 0;
                // if (parseFloat(data_payment_status) == 2) {
                if (parseFloat(purchase_paid) == parseFloat(grand_total)) {
                  data_payment_status = 2;
                } else if (
                  parseFloat(purchase_paid) > 0 &&
                  parseFloat(purchase_paid) < parseFloat(grand_total)
                ) {
                  data_payment_status = 1;
                } else {
                  purchase_order_payment_details = [];
                  data_payment_status = 0;
                }
                // }

                //purchase order payment create
                if (purchase_order_payment_details?.length > 0) {
                  for (value of purchase_order_payment_details) {
                    const purchase_order_payment =
                      await purchase_orders_payments({
                        purchase: purchase_order_save?._id,
                        name: value?.name,
                        amount: value?.amount,
                        status: status ? status : 0,
                        ref: authorize?.ref,
                        branch: branch ? branch : authorize?.branch,
                        created: new Date(),
                        created_by: authorize?.id,
                      });

                    const purchase_order_payment_save =
                      await purchase_order_payment?.save();

                    // ManualJournal entry: Add create the journal entry.
                    // ===== ADD ACCOUNTING INTEGRATION HERE =====
                    // try {
                    //   // Get accounts
                    //   const [payableAccount, cashAccount] = await Promise.all([
                    //     Account.findOne({ isPayable: true, branch: branch || authorize.branch }),
                    //     Account.findOne({ type: "Bank & Cash", branch: branch || authorize.branch })
                    //   ]);

                    //   if (!payableAccount || !cashAccount) {
                    //     throw new Error("Accounting accounts not configured");
                    //   }

                    //   // Create journal entry
                    //   await new ManualJournal({
                    //     date: new Date(),
                    //     description: `Payment for PO ${purchase_order_save.number}`,
                    //     entries: [
                    //       {
                    //         account: payableAccount._id,
                    //         type: "debit",
                    //         amount: value.amount
                    //       },
                    //       {
                    //         account: cashAccount._id,
                    //         type: "credit",
                    //         amount: value.amount
                    //       }
                    //     ],
                    //     referenceNumber: `PAY-${purchase_order_payment_save._id}`,
                    //     branch: branch || authorize.branch,
                    //     created_by: authorize.id
                    //   }).save();

                    // } catch (error) {
                    //   console.error("Accounting integration failed:", error.message);
                    //   // Rollback payment if needed
                    //   await purchase_orders_payments.findByIdAndDelete(purchase_order_payment_save._id);
                    //   throw error; // This will trigger the main catch block
                    // }
                   //end here of the above journal entry
                }
              }

              selected_purchase_order.subtotal = purchase_subtotal
                ? purchase_subtotal
                : 0;
              selected_purchase_order.taxamount = purchase_taxamount
                ? purchase_taxamount
                : 0;
              selected_purchase_order.discount = purchase_discount
                ? purchase_discount
                : 0;
              selected_purchase_order.delivery = purchase_delivery
                ? purchase_delivery
                : 0;
              selected_purchase_order.delivery_status = data_delivery_status
                ? data_delivery_status
                : 0;
              selected_purchase_order.delivery_date = data_delivery_date;
              selected_purchase_order.payment_status = data_payment_status
                ? data_payment_status
                : 0;
              selected_purchase_order.total = grand_total ? grand_total : 0;

              const selected_purchase_order_save =
                await selected_purchase_order?.save();

              success_200(res, "Purchase order created");
            } else {
              failed_400("Purchase not found");
            }
          } else {
            failed_400(res, "Purchase failed");
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
    purchase_price = 0,
    quantity = 0,
    tax = 0,
    free = 0,
    delivered = 0,
    unit_details_options = [],
  } = detail;

  const totalQuantity = parseFloat(quantity || 0) + parseFloat(free || 0);
  const price = parseFloat(quantity || 0) * parseFloat(purchase_price || 0);
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

    if (!id || !supplier || !date || !due_date || !(details?.length > 0)) {
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
          supplier: supplier,
          purchase_price: isMainUnit ? detail?.purchase_price : 0,
          price_per_unit: isMainUnit ? detail?.price_per_unit : 0,
          sale_price: isMainUnit ? detail?.sale_price : 0,
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
                stock: total_sub_unit_delivered,
              }
              : // product unit
              {
                name: unit?.name,
                conversion: unit.conversion,
                purchase_price: unit.purchase_price,
                price_per_unit: unit.price_per_unit,
                sale_price: unit.sale_price,
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
