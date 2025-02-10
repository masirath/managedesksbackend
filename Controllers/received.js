const { authorization } = require("../Global/authorization");
const {
  failed_400,
  unauthorized,
  catch_400,
  incomplete_400,
  success_200,
} = require("../Global/errors");
const received = require("../Models/received");
const { checknull } = require("../Global/checknull");
const products = require("../Models/products");
const received_details = require("../Models/received_details");
const received_log = require("../Models/received_log");
const received_details_log = require("../Models/received_details_log");
const inventories = require("../Models/inventories");
const product_units_details = require("../Models/product_units_details");
const received_units_details = require("../Models/received_units_details");
// const received_payments = require("../Models/received_payments");
const inventories_units_details = require("../Models/inventories_units_details");
// const received_payments_log = require("../Models/received_payments_log");
const received_units_details_log = require("../Models/received_units_details_log");
const inventories_log = require("../Models/inventories_log");
const inventories_units_details_log = require("../Models/inventories_units_details_log");
const { default: mongoose } = require("mongoose");
const transfers = require("../Models/transfers");
const transfers_details = require("../Models/transfers_details");
const transfers_units_details = require("../Models/transfers_units_details");

const get_next_receive = async (req, res, number) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const total_receive = await received.countDocuments({
        // branch: authorize?.branch,
        ref: authorize?.ref,
      });

      const next_receive_number = number + total_receive;

      const existing_receive_number = await received.findOne({
        number: next_receive_number,
        // branch: authorize?.branch,
        ref: authorize?.ref,
      });

      if (existing_receive_number) {
        return await get_next_receive(req, res, next_receive_number);
      } else {
        return next_receive_number;
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

const create_receive = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const {
        transfer,
        supplier,
        number,
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

      let new_number = await get_next_receive(req, res, 1000);
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
        const selected_transfer = await transfers?.findById(transfer);
        console.log(selected_transfer, "selected_transfer");

        if (selected_transfer?.received) {
          success_200(res, "Already added to inventory");
        } else {
          const selected_purchase_number = await transfers?.findOne({
            _id: { $ne: transfer },
            number: assigned_number,
            // branch: branch ? branch : authorize?.branch,
            ref: authorize?.ref,
            status: 1,
          });

          if (selected_purchase_number) {
            failed_400(res, "Received number exists");
          } else {
            //create purchase order
            const receive = new received({
              supplier: supplier,
              number: assigned_number,
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

            const receive_save = await receive?.save();

            //purchase order details
            let purchase_subtotal = 0;
            let purchase_taxamount = 0;
            let purchase_total = 0;
            let delivery_count = 0;
            let count = 0;

            if (details?.length > 0) {
              for (value of details) {
                // const selected_product = await products
                //   ?.findById?.(value?.description)
                //   ?.populate({
                //     path: "unit",
                //     match: { status: { $ne: 2 } },
                //   });

                const selected_product = await products
                  ?.findOne?.({ name: value?.name })
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
                    // if (selected_product?._id == value?.unit) {
                    if (selected_product?.name == value?.name) {
                      const selectedDetails = await Promise.all(
                        unit_details_options?.map(async (v, index) => {
                          const selected_product_units_detail =
                            await product_units_details
                              ?.findById(v?._id)
                              ?.populate("name");
                          // const selected_product_units_detail =
                          //   await product_units_details
                          //     ?.findOne(v?.unit_name)
                          //     ?.populate("name");

                          return {
                            name: selected_product_units_detail?.name?.name,
                            quantity: selected_product_units_detail?.quantity
                              ? selected_product_units_detail?.quantity
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
                    let inventory_stock = value?.delivered
                      ? value?.delivered
                      : 0;
                    let inventory_unit_details_options =
                      purchase_unit_details_options;

                    // if (selected_product?._id == value?.unit) {
                    if (selected_product?.name == value?.name) {
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
                      purchase: receive_save?._id,
                      // product: value?.description,
                      product: selected_product?._id,
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
                    const receive_detail = new received_details({
                      purchase: receive_save?._id,
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

                    const receive_detail_save = await receive_detail?.save();

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
                              purchase_price: v?.price_per_unit,
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
                          const receive_unit_detail =
                            new received_units_details({
                              details: receive_detail_save?._id,
                              inventory_unit:
                                inventories_units_detail_save?._id,
                              name: v?.name,
                              quantity: v?.quantity,
                              purchase_price: v?.price_per_unit,
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

                          const receive_unit_detail_save =
                            receive_unit_detail?.save();
                        }
                      }
                    }
                  }

                  purchase_subtotal =
                    parseFloat(purchase_subtotal) + parseFloat(price);
                  purchase_taxamount =
                    parseFloat(purchase_taxamount) + parseFloat(tax_amount);
                  purchase_total =
                    parseFloat(purchase_total) + parseFloat(total);

                  count++;
                }
              }

              //total update
              if (count == details?.length) {
                const selected_receive = await received?.findById(
                  receive_save?._id
                );

                if (selected_receive) {
                  //delivery status
                  let data_delivery_status = delivery_status
                    ? parseFloat(delivery_status || 0)
                    : 0;
                  let data_delivery_date = delivery_date ? delivery_date : "";

                  if (parseFloat(data_delivery_status) == 2) {
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
                  }

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
                  let receive_payment_details = [];
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

                      receive_payment_details?.push({
                        id: purchase_payment_id,
                        name: value,
                        amount: purchase_payment_amount,
                      });
                    }
                  }

                  let data_payment_status = payment_status
                    ? parseFloat(payment_status || 0)
                    : 0;
                  if (parseFloat(data_payment_status) == 2) {
                    if (parseFloat(purchase_paid) == parseFloat(grand_total)) {
                      data_payment_status = 2;
                    } else if (
                      parseFloat(purchase_paid) > 0 &&
                      parseFloat(purchase_paid) < parseFloat(grand_total)
                    ) {
                      data_payment_status = 1;
                    } else {
                      receive_payment_details = [];
                      data_payment_status = 0;
                    }
                  }

                  //purchase order payment create
                  // if (receive_payment_details?.length > 0) {
                  //   for (value of receive_payment_details) {
                  //     const receive_payment = await received_payments({
                  //       purchase: receive_save?._id,
                  //       name: value?.name,
                  //       amount: value?.amount,
                  //       status: status ? status : 0,
                  //       ref: authorize?.ref,
                  //       branch: branch ? branch : authorize?.branch,
                  //       created: new Date(),
                  //       created_by: authorize?.id,
                  //     });

                  //     const receive_payment_save = await receive_payment?.save();
                  //   }
                  // }

                  selected_receive.subtotal = purchase_subtotal
                    ? purchase_subtotal
                    : 0;
                  selected_receive.taxamount = purchase_taxamount
                    ? purchase_taxamount
                    : 0;
                  selected_receive.discount = purchase_discount
                    ? purchase_discount
                    : 0;
                  selected_receive.delivery = purchase_delivery
                    ? purchase_delivery
                    : 0;
                  selected_receive.delivery_status = data_delivery_status
                    ? data_delivery_status
                    : 0;
                  selected_receive.delivery_date = data_delivery_date;
                  selected_receive.payment_status = data_payment_status
                    ? data_payment_status
                    : 0;
                  selected_receive.total = grand_total ? grand_total : 0;

                  const selected_receive_save = await selected_receive?.save();

                  selected_transfer.received = 1;
                  const selected_transfer_save =
                    await selected_transfer?.save();

                  success_200(res, "Received order created");
                } else {
                  failed_400("Received not found");
                }
              } else {
                failed_400(res, "Received failed");
              }
            } else {
              failed_400(res, "Details missing");
            }
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
          price_per_unit:
            parseFloat(total || 0) / parseFloat(totalQuantity || 0),
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
    isFullyDelivered: parseFloat(delivered) >= totalQuantity,
    isMainUnit,
    unitDetails: unitDetails,
  };

  return purchaseDetails;
};

const update_receive = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const authorize = authorization(req);

    if (!authorize) return unauthorized(res);

    const {
      id,
      supplier,
      number,
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

    success_200(res, "Received order updated.");
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    catch_400(res, err.message);
  }
};

const delete_receive = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_receive = await received?.findById(id);

        if (!selected_receive || selected_receive?.status == 2) {
          failed_400(res, "Received Order not found");
        } else {
          const receive_log = new received_log({
            purchase: id,
            supplier: selected_receive?.supplier,
            number: selected_receive?.number,
            date: selected_receive?.date,
            due_date: selected_receive?.due_date,
            subtotal: selected_receive?.subtotal,
            taxamount: selected_receive?.taxamount,
            discount: selected_receive?.discount,
            delivery: selected_receive?.delivery,
            delivery_status: selected_receive?.delivery_status,
            delivery_date: selected_receive?.delivery_date,
            payment_status: selected_receive?.payment_status,
            payment_types: selected_receive?.payment_types,
            payments: selected_receive?.payments,
            paid: selected_receive?.paid,
            remaining: selected_receive?.remaining,
            total: selected_receive?.total,
            status: selected_receive?.status,
            ref: selected_receive?.ref,
            branch: selected_receive?.branch,
            updated: new Date(),
            updated_by: authorize?.id,
          });
          const receive_log_save = await receive_log?.save();

          selected_receive.status = 2;
          const delete_receive = await selected_receive?.save();

          success_200(res, "Received Order deleted");
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_receive = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_transfer = await transfers
          ?.findById(id)
          ?.populate("supplier")
          ?.populate("branch");

        if (!selected_transfer || selected_transfer?.status == 2) {
          failed_400(res, "Purchase Order not found");
        } else {
          //   const selected_transfers_payments = await transfers_payments?.find({
          //     transfer: selected_transfer?._id,
          //   });

          const selected_transfer_details = await transfers_details
            ?.find({
              transfer: selected_transfer?._id,
            })
            ?.populate({
              path: "description",
              match: { status: { $ne: 2 } },
            });

          let transfer_details_and_units = [];

          for (value of selected_transfer_details) {
            let details = value?.toObject();

            let selected_inventory_unit_details =
              await inventories_units_details?.find({
                inventory: value?.description?._id,
              });

            const selected_transfer_details_units =
              await transfers_units_details?.find({
                details: value?._id,
              });
            // ?.sort({ created: 1 });

            transfer_details_and_units?.push({
              ...details,
              unit_details_options: selected_transfer_details_units,
              inventory_unit_details: selected_inventory_unit_details,
            });
          }

          const transferData = selected_transfer?.toObject();

          success_200(res, "", {
            ...transferData,
            // payments: selected_transfers_payments,
            details: transfer_details_and_units,
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

const get_receive_inventories = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_receive = await received
          ?.findById(id)
          ?.populate("supplier")
          ?.populate("branch");

        if (!selected_receive || selected_receive?.status == 2) {
          failed_400(res, "Received Order not found");
        } else {
          // const selected_received_payments = await received_payments?.find({
          //   purchase: selected_receive?._id,
          // });

          const selected_receive_details = await received_details
            ?.find({
              purchase: selected_receive?._id,
            })
            ?.populate({
              path: "description",
              match: { status: { $ne: 2 } },
            });

          let receive_details_and_units = [];

          for (value of selected_receive_details) {
            let details = value?.toObject();

            const selected_inventory = await inventories?.findOne({
              detail: value?._id,
            });

            const selected_receive_details_units = await received_units_details
              ?.find({
                details: value?._id,
              })
              ?.sort({ created: 1 });

            receive_details_and_units?.push({
              ...details,
              description: {
                _id: selected_inventory?._id,
                number: selected_inventory?.number,
                expiry_date: selected_inventory?.expiry_date,
                stock: selected_inventory?.stock,
              },
              unit_details_options: selected_receive_details_units,
            });
          }

          const purchaseData = selected_receive?.toObject();

          success_200(res, "", {
            ...purchaseData,
            // payments: selected_received_payments,
            details: receive_details_and_units,
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

const get_all_received = async (req, res) => {
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

    const transfersList = {
      // branch: authorize?.branch,
      supplier: authorize?.branch,
      status: { $ne: 2 },
    };

    // Apply filters based on request body
    if (search) {
      transfersList.$or = [{ number: { $regex: search, $options: "i" } }];
    }
    // if (supplier) transfersList.supplier = supplier;
    if (contractor) transfersList.contractor = contractor;
    if (status == 0) transfersList.status = status;

    if (date?.start && date?.end) {
      transfersList.date = {
        $gte: new Date(date?.start),
        $lte: new Date(date?.end),
      };
    }

    if (due_date?.start && due_date?.end) {
      transfersList.due_date = {
        $gte: new Date(due_date?.start),
        $lte: new Date(due_date?.end),
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
    const totalCount = await transfers.countDocuments(transfersList);

    // Fetch paginated data
    const paginated_transfers = await transfers
      .find(transfersList)
      .sort(sortOption)
      .skip((page_number - 1) * page_limit)
      .limit(page_limit)
      .populate("supplier");

    const totalPages = Math.ceil(totalCount / page_limit);

    success_200(res, "", {
      currentPage: page_number,
      totalPages,
      totalCount,
      data: paginated_transfers,
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

      const receivedList = { branch: authorize?.branch };
      receivedList.status = { $ne: 2 };

      // Apply filters based on request body
      search &&
        (receivedList.$or = [{ number: { $regex: search, $options: "i" } }]);
      supplier && (receivedList.supplier = supplier);
      contractor && (receivedList.supplier = contractor);
      status == 0 && (receivedList.status = status);

      // Set sorting options
      let sortOption = { created: -1 };
      if (sort == 0) {
        sortOption = { total: 1 };
      } else if (sort == 1) {
        sortOption = { total: -1 };
      }

      if (date?.start && date?.end) {
        receivedList.date = {
          $gte: new Date(date?.start),
          $lte: new Date(date?.end),
        };
      }

      // due_date
      if (due_date?.start && due_date?.end) {
        receivedList.due_date = {
          $gte: new Date(due_date?.start),
          $lte: new Date(due_date?.end),
        };
      }

      const all_received = await received_details
        .find(receivedList)
        .sort(sortOption);
      // ?.populate("supplier");

      success_200(res, "", all_received);
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
          failed_400(res, "Received not found");
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
        const selected_receive_detail = await received_details
          .find({ description: id, status: 1 })
          .populate({
            path: "purchase",
            match: { status: 1 },
            populate: { path: "supplier" },
          });

        selected_receive_detail.sort((a, b) => {
          const dateA = new Date(a.purchase?.date);
          const dateB = new Date(b.purchase?.date);
          return dateB - dateA;
        });

        success_200(res, "", selected_receive_detail);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_receive,
  update_receive,
  delete_receive,
  get_receive,
  get_receive_inventories,
  get_all_purchases_details,
  get_all_received,
  get_all_purchase_details,
  get_purchase_log,
  get_all_purchases_log,
};
