const { authorization } = require("../Global/authorization");
const {
  failed_400,
  unauthorized,
  catch_400,
  incomplete_400,
  success_200,
} = require("../Global/errors");
const purchases_returns = require("../Models/purchases_returns");
const { checknull } = require("../Global/checknull");
const inventories = require("../Models/inventories");
const purchases_returns_details = require("../Models/purchases_returns_details");
const purchases_returns_log = require("../Models/purchases_returns_log");
const purchases_returns_details_log = require("../Models/purchases_returns_details_log");
const purchases_returns_units_details = require("../Models/purchases_returns_units_details");
const purchases_returns_payments = require("../Models/purchases_returns_payments");
const inventories_units_details = require("../Models/inventories_units_details");
const purchases_returns_payments_log = require("../Models/purchases_returns_payments_log");
const purchases_returns_units_details_log = require("../Models/purchases_returns_units_details_log");
const inventories_log = require("../Models/inventories_log");
const inventories_units_details_log = require("../Models/inventories_units_details_log");
const { default: mongoose } = require("mongoose");

const get_next_purchases_return = async (req, res, number) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const total_purchases_return = await purchases_returns.countDocuments({
        branch: authorize?.branch,
      });

      const next_purchases_return_number = number + total_purchases_return;

      const existing_purchases_return_number = await purchases_returns.findOne({
        number: next_purchases_return_number,
        branch: authorize?.branch,
      });

      if (existing_purchases_return_number) {
        return await get_next_purchases_return(
          req,
          res,
          next_purchases_return_number
        );
      } else {
        return next_purchases_return_number;
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

const create_purchases_return = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const {
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

      let new_number = await get_next_purchases_return(req, res, 1000);
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
        const selected_purchases_return_number =
          await purchases_returns?.findOne({
            number: assigned_number,
            branch: branch ? branch : authorize?.branch,
          });

        if (selected_purchases_return_number) {
          failed_400(res, "Purchase return number exists");
        } else {
          //create purchases_return
          const purchases_return = new purchases_returns({
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

          const purchases_return_save = await purchases_return?.save();

          //purchases_return details
          let purchases_return_details = [];
          let purchases_return_subtotal = 0;
          let purchases_return_taxamount = 0;
          let purchases_return_total = 0;
          let delivery_count = 0;
          let count = 0;

          if (details?.length > 0) {
            for (value of details) {
              const selected_inventory = await inventories
                ?.findById(value?.description)
                ?.populate({
                  path: "product",
                  match: { status: 1 },
                  populate: { path: "unit" },
                });

              //if selected sub unit
              const selected_inventories_units_details =
                await inventories_units_details?.find({
                  inventory: selected_inventory?._id,
                });

              let selected_unit = {};
              if (selected_inventories_units_details?.length > 0) {
                for (v of selected_inventories_units_details) {
                  if (v?._id == value?.unit) {
                    selected_unit = v;
                  }
                }
              }

              if (selected_inventory) {
                let purchases_return_unit = value?.unit ? value?.unit : "";
                let purchases_return_unit_name = value?.unit_name
                  ? value?.unit_name
                  : "";
                let purchases_return_sale_price =
                  selected_inventory?._id == value?.unit
                    ? selected_inventory?.sale_price
                      ? selected_inventory?.sale_price
                      : 0
                    : selected_unit?.sale_price
                    ? selected_unit?.sale_price
                    : 0;
                let purchases_return_purchase_price =
                  selected_inventory?._id == value?.unit
                    ? selected_inventory?.purchase_price
                      ? selected_inventory?.purchase_price
                      : 0
                    : selected_unit?.purchase_price
                    ? selected_unit?.purchase_price
                    : 0;
                let purchases_return_price_per_unit =
                  selected_inventory?._id == value?.unit
                    ? selected_inventory?.price_per_unit
                      ? selected_inventory?.price_per_unit
                      : 0
                    : selected_unit?.price_per_unit
                    ? selected_unit?.price_per_unit
                    : 0;
                let purchases_return_conversion =
                  selected_inventory?._id == value?.unit
                    ? selected_inventory?.conversion
                      ? selected_inventory?.conversion
                      : 0
                    : selected_unit?.conversion
                    ? selected_unit?.conversion
                    : 0;
                let purchases_return_quantity = value?.quantity
                  ? value?.quantity
                  : 0;
                let purchases_return_delivered = value?.delivered
                  ? value?.delivered
                  : 0;
                let purchases_return_free = value?.free ? value?.free : 0;
                let purchases_return_tax = selected_inventory?.tax
                  ? selected_inventory?.tax
                  : 0;
                let purchases_return_barcode = selected_inventory?.barcode
                  ? selected_inventory?.barcode
                  : "";
                let purchases_return_expiry_date =
                  selected_inventory?.expiry_date
                    ? selected_inventory?.expiry_date
                    : "";

                let price =
                  parseFloat(purchases_return_quantity) *
                  parseFloat(purchases_return_purchase_price);
                let tax_amount =
                  parseFloat(price) * (parseFloat(purchases_return_tax) / 100);
                let total = parseFloat(price) + parseFloat(tax_amount);

                let total_quantity =
                  parseFloat(purchases_return_quantity) +
                  parseFloat(purchases_return_free);
                purchases_return_delivered =
                  parseFloat(purchases_return_delivered) <=
                  parseFloat(total_quantity)
                    ? purchases_return_delivered
                    : total_quantity;

                //delivery status count
                if (
                  parseFloat(total_quantity) ==
                  parseFloat(purchases_return_delivered)
                ) {
                  delivery_count++;
                }

                //inventories create (stock calculation)
                let inventory_stock = 0;
                if (selected_inventory?._id == value?.unit) {
                  //if main unit
                  let stock = parseFloat(selected_inventory?.stock || 0);

                  if (
                    parseFloat(value?.delivered || 0) <=
                    parseFloat(selected_inventory?.stock || 0)
                  ) {
                    stock =
                      parseFloat(selected_inventory?.stock || 0) -
                      parseFloat(value?.delivered || 0);
                  } else {
                    stock = 0;
                  }

                  inventory_stock = stock;
                } else {
                  //if sub unit
                  let stock = parseFloat(selected_inventory?.stock || 0);
                  let delivered = parseFloat(value?.delivered || 0);
                  let conversion = parseFloat(selected_unit?.conversion || 0);

                  let total_unit_stock =
                    parseFloat(delivered || 0) / parseFloat(conversion || 0);

                  console.log(total_unit_stock, stock);

                  if (
                    parseFloat(total_unit_stock || 0) <= parseFloat(stock || 0)
                  ) {
                    stock =
                      parseFloat(stock || 0) -
                      parseFloat(total_unit_stock || 0);
                  } else {
                    stock = 0;
                  }

                  inventory_stock = stock;
                }

                selected_inventory.stock = inventory_stock;
                const selected_inventory_save =
                  await selected_inventory?.save();

                //purchases_return details create
                const purchases_return_detail = new purchases_returns_details({
                  purchases_return: purchases_return_save?._id,
                  description: selected_inventory?._id,
                  name: selected_inventory?.product?.name,
                  unit: purchases_return_unit,
                  unit_name: purchases_return_unit_name,
                  sale_price: purchases_return_sale_price,
                  purchase_price: purchases_return_purchase_price,
                  conversion: purchases_return_conversion,
                  quantity: purchases_return_quantity,
                  delivered: purchases_return_delivered,
                  free: purchases_return_free,
                  tax: purchases_return_tax,
                  barcode: purchases_return_barcode,
                  price_per_unit: purchases_return_price_per_unit,
                  expiry_date: purchases_return_expiry_date,
                  tax_amount: tax_amount,
                  total: total,
                  status: status ? status : 0,
                  ref: authorize?.ref,
                  branch: branch ? branch : authorize?.branch,
                  created: new Date(),
                  created_by: authorize?.id,
                });
                const purchases_return_detail_save =
                  await purchases_return_detail?.save();

                //inventory units details
                if (selected_inventories_units_details?.length > 0) {
                  for (v of selected_inventories_units_details) {
                    if (v?._id == value?.unit) {
                      let selected_inventory_unit_detail =
                        await inventories_units_details?.findById(v?._id);

                      if (selected_inventory_unit_detail) {
                        let unit_stock = parseFloat(
                          selected_inventory_unit_detail?.stock || 0
                        );

                        if (
                          parseFloat(value?.delivered || 0) <=
                          parseFloat(unit_stock || 0)
                        ) {
                          unit_stock =
                            parseFloat(unit_stock || 0) -
                            parseFloat(value?.delivered || 0);
                        } else {
                          unit_stock = 0;
                        }

                        selected_inventory_unit_detail.stock = unit_stock;
                        const selected_inventory_unit_detail_save =
                          await selected_inventory_unit_detail?.save();
                      }
                    } else {
                      let selected_inventory_unit_detail =
                        await inventories_units_details?.findById(v?._id);

                      let unit_stock = parseFloat(
                        selected_inventory_unit_detail?.stock || 0
                      );
                      let delivered = parseFloat(value?.delivered || 0);
                      let conversion = parseFloat(v?.conversion || 0);

                      let total_unit_stock =
                        parseFloat(delivered || 0) *
                        parseFloat(conversion || 0);

                      if (
                        parseFloat(total_unit_stock || 0) <=
                        parseFloat(unit_stock || 0)
                      ) {
                        unit_stock =
                          parseFloat(unit_stock || 0) -
                          parseFloat(total_unit_stock);
                      } else {
                        unit_stock = 0;
                      }

                      selected_inventory_unit_detail.stock = unit_stock;

                      const selected_inventory_unit_detail_save =
                        await selected_inventory_unit_detail?.save();

                      //purchases_return unit details
                      const purchases_return_unit_detail =
                        new purchases_returns_units_details({
                          details: purchases_return_detail_save?._id,
                          inventory_unit: selected_inventory_unit_detail?._id,
                          name: v?.name,
                          quantity:
                            parseFloat(value?.quantity || 0) *
                            parseFloat(v?.conversion || 0),
                          purchase_price: v?.price_per_unit,
                          price_per_unit: v?.price_per_unit,
                          sale_price: v?.sale_price,
                          conversion: v?.conversion,
                          unit_quantity:
                            parseFloat(value?.quantity || 0) *
                            parseFloat(v?.conversion || 0),
                          unit_delivered: total_unit_stock,
                          status: status ? status : 0,
                          ref: authorize?.ref,
                          branch: branch ? branch : authorize?.branch,
                          created: new Date(),
                          created_by: authorize?.id,
                        });

                      const purchases_return_unit_detail_save =
                        purchases_return_unit_detail?.save();
                    }
                  }
                }

                purchases_return_subtotal =
                  parseFloat(purchases_return_subtotal) + parseFloat(price);
                purchases_return_taxamount =
                  parseFloat(purchases_return_taxamount) +
                  parseFloat(tax_amount);
                purchases_return_total =
                  parseFloat(purchases_return_total) + parseFloat(total);

                count++;
              }
            }
          }

          if (count == details?.length) {
            const selected_purchases_return = await purchases_returns?.findById(
              purchases_return_save?._id
            );

            if (selected_purchases_return) {
              //delivery status
              let data_delivery_status = delivery_status
                ? parseFloat(delivery_status || 0)
                : 0;
              let data_delivery_date = delivery_date ? delivery_date : "";

              if (parseFloat(data_delivery_status) == 2) {
                if (
                  parseFloat(delivery_count) == purchases_return_details?.length
                ) {
                  data_delivery_status = 2;
                } else if (
                  parseFloat(delivery_count) > 0 &&
                  parseFloat(delivery_count) < purchases_return_details?.length
                ) {
                  data_delivery_status = 1;
                  data_delivery_date = "";
                } else {
                  data_delivery_status = 0;
                  data_delivery_date = "";
                }
              }

              //grand total
              let purchases_return_discount = 0;
              if (discount) {
                if (discount <= purchases_return_total) {
                  purchases_return_discount = discount;
                }
              }

              let purchases_return_delivery = delivery ? delivery : 0;

              let grand_total =
                parseFloat(purchases_return_total) +
                parseFloat(purchases_return_delivery) -
                parseFloat(purchases_return_discount);

              //payment status
              let purchases_return_payment_types = payment_types
                ? JSON?.parse(payment_types)
                : "";
              let purchases_return_payments = payments
                ? JSON?.parse(payments)
                : "";

              let purchases_return_paid = 0;
              let purchases_return_payment_details = [];
              if (purchases_return_payment_types?.length > 0) {
                for (value of purchases_return_payment_types) {
                  let purchases_return_payment_id = purchases_return_payments[
                    value
                  ]?.id
                    ? purchases_return_payments[value]?.id
                    : "";
                  let purchases_return_payment_amount =
                    purchases_return_payments[value]?.amount
                      ? parseFloat(purchases_return_payments[value]?.amount)
                      : 0;

                  purchases_return_paid =
                    parseFloat(purchases_return_paid) +
                    parseFloat(purchases_return_payment_amount);

                  purchases_return_payment_details?.push({
                    id: purchases_return_payment_id,
                    name: value,
                    amount: purchases_return_payment_amount,
                  });
                }
              }

              let data_payment_status = payment_status
                ? parseFloat(payment_status || 0)
                : 0;
              if (parseFloat(data_payment_status) == 2) {
                if (
                  parseFloat(purchases_return_paid) == parseFloat(grand_total)
                ) {
                  data_payment_status = 2;
                } else if (
                  parseFloat(purchases_return_paid) > 0 &&
                  parseFloat(purchases_return_paid) < parseFloat(grand_total)
                ) {
                  data_payment_status = 1;
                } else {
                  purchases_return_payment_details = [];
                  data_payment_status = 0;
                }
              }

              //order payment
              if (purchases_return_payment_details?.length > 0) {
                for (value of purchases_return_payment_details) {
                  const purchases_return_payment =
                    await purchases_returns_payments({
                      purchases_return: purchases_return_save?._id,
                      name: value?.name,
                      amount: value?.amount,
                      status: status ? status : 0,
                      ref: authorize?.ref,
                      branch: branch ? branch : authorize?.branch,
                      created: new Date(),
                      created_by: authorize?.id,
                    });

                  const purchases_return_payment_save =
                    await purchases_return_payment?.save();
                }
              }

              selected_purchases_return.subtotal = purchases_return_subtotal
                ? purchases_return_subtotal
                : 0;
              selected_purchases_return.taxamount = purchases_return_taxamount
                ? purchases_return_taxamount
                : 0;
              selected_purchases_return.discount = purchases_return_discount
                ? purchases_return_discount
                : 0;
              selected_purchases_return.delivery = purchases_return_delivery
                ? purchases_return_delivery
                : 0;
              selected_purchases_return.delivery_status = data_delivery_status
                ? data_delivery_status
                : 0;
              selected_purchases_return.delivery_date = data_delivery_date;
              selected_purchases_return.payment_status = data_payment_status
                ? data_payment_status
                : 0;
              selected_purchases_return.total = grand_total ? grand_total : 0;

              const selected_purchases_return_save =
                await selected_purchases_return?.save();

              success_200(res, "Purchase return created");
            } else {
              failed_400(res, "Purchase return failed");
            }
          } else {
            failed_400(res, "Purchase return failed");
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

const update_purchases_return = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const {
        id,
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

      let new_number = await get_next_purchases_return(req, res, 1000);
      let assigned_number = number ? number : new_number;

      if (
        !supplier ||
        !id ||
        !assigned_number ||
        !date ||
        !due_date ||
        !details?.length > 0
      ) {
        incomplete_400(res);
      } else {
        const selected_purchases_return = await purchases_returns?.findById(id);

        if (
          !selected_purchases_return ||
          selected_purchases_return?.status == 2
        ) {
          failed_400(res, "Purchase return Order not found");
        } else {
          const selected_purchases_return_number =
            await purchases_returns?.findOne({
              _id: { $ne: id },
              number: assigned_number,
              status: 1,
              branch: branch ? branch : authorize?.branch,
            });

          if (selected_purchases_return_number) {
            failed_400(res, "Purchase return number exists");
          } else {
            //purchases_return details
            let purchases_return_details = [];
            let purchases_return_subtotal = 0;
            let purchases_return_taxamount = 0;
            let purchases_return_total = 0;
            let delivery_count = 0;
            let count = 0;

            if (details?.length > 0) {
              for (value of details) {
                const selected_inventory = await inventories
                  ?.findById(value?.description)
                  ?.populate({
                    path: "product",
                    match: { status: 1 },
                    populate: { path: "unit" },
                  });

                //if selected sub unit
                const selected_inventories_units_details =
                  await inventories_units_details?.find({
                    inventory: selected_inventory?._id,
                  });

                let selected_unit = {};
                if (selected_inventories_units_details?.length > 0) {
                  for (v of selected_inventories_units_details) {
                    if (v?._id == value?.unit) {
                      selected_unit = v;
                    }
                  }
                }

                if (selected_inventory) {
                  let purchases_return_unit = value?.unit ? value?.unit : "";
                  let purchases_return_unit_name = value?.unit_name
                    ? value?.unit_name
                    : "";
                  let purchases_return_sale_price =
                    selected_inventory?._id == value?.unit
                      ? selected_inventory?.sale_price
                        ? selected_inventory?.sale_price
                        : 0
                      : selected_unit?.sale_price
                      ? selected_unit?.sale_price
                      : 0;
                  let purchases_return_purchase_price =
                    selected_inventory?._id == value?.unit
                      ? selected_inventory?.purchase_price
                        ? selected_inventory?.purchase_price
                        : 0
                      : selected_unit?.purchase_price
                      ? selected_unit?.purchase_price
                      : 0;
                  let purchases_return_price_per_unit =
                    selected_inventory?._id == value?.unit
                      ? selected_inventory?.price_per_unit
                        ? selected_inventory?.price_per_unit
                        : 0
                      : selected_unit?.price_per_unit
                      ? selected_unit?.price_per_unit
                      : 0;
                  let purchases_return_conversion =
                    selected_inventory?._id == value?.unit
                      ? selected_inventory?.conversion
                        ? selected_inventory?.conversion
                        : 0
                      : selected_unit?.conversion
                      ? selected_unit?.conversion
                      : 0;
                  let purchases_return_quantity = value?.quantity
                    ? value?.quantity
                    : 0;
                  let purchases_return_delivered = value?.delivered
                    ? value?.delivered
                    : 0;
                  let purchases_return_free = value?.free ? value?.free : 0;
                  let purchases_return_tax = selected_inventory?.tax
                    ? selected_inventory?.tax
                    : 0;
                  let purchases_return_barcode = selected_inventory?.barcode
                    ? selected_inventory?.barcode
                    : "";
                  let purchases_return_expiry_date =
                    selected_inventory?.expiry_date
                      ? selected_inventory?.expiry_date
                      : "";

                  let price =
                    parseFloat(purchases_return_quantity) *
                    parseFloat(purchases_return_purchase_price);
                  let tax_amount =
                    parseFloat(price) *
                    (parseFloat(purchases_return_tax) / 100);
                  let total = parseFloat(price) + parseFloat(tax_amount);

                  let total_quantity =
                    parseFloat(purchases_return_quantity) +
                    parseFloat(purchases_return_free);
                  purchases_return_delivered =
                    parseFloat(purchases_return_delivered) <=
                    parseFloat(total_quantity)
                      ? purchases_return_delivered
                      : total_quantity;

                  //delivery status count
                  if (
                    parseFloat(total_quantity) ==
                    parseFloat(purchases_return_delivered)
                  ) {
                    delivery_count++;
                  }

                  const selected_purchases_returns_details =
                    await purchases_returns_details?.findOne({
                      description: selected_inventory?._id,
                    });

                  //inventories create (stock calculation)
                  let inventory_stock = 0;
                  if (selected_inventory?._id == value?.unit) {
                    //if main unit
                    let stock = parseFloat(selected_inventory?.stock || 0);

                    let previous_stock =
                      selected_purchases_returns_details?.delivered;

                    let current_stock =
                      parseFloat(value?.delivered || 0) -
                      parseFloat(previous_stock || 0);

                    if (
                      parseFloat(current_stock || 0) <=
                      parseFloat(selected_inventory?.stock || 0)
                    ) {
                      stock =
                        parseFloat(selected_inventory?.stock || 0) -
                        parseFloat(current_stock || 0);
                    } else {
                      stock = 0;
                    }

                    inventory_stock = stock;
                  } else {
                    //if sub unit
                    let stock = parseFloat(selected_inventory?.stock || 0);
                    let delivered = parseFloat(value?.delivered || 0);
                    let conversion = parseFloat(selected_unit?.conversion || 0);

                    let total_unit_stock =
                      parseFloat(delivered || 0) / parseFloat(conversion || 0);

                    let previous_stock =
                      selected_purchases_returns_details?.delivered;

                    let current_stock =
                      parseFloat(total_unit_stock || 0) -
                      parseFloat(previous_stock || 0);

                    if (
                      parseFloat(current_stock || 0) <= parseFloat(stock || 0)
                    ) {
                      stock =
                        parseFloat(stock || 0) - parseFloat(current_stock || 0);
                    } else {
                      stock = 0;
                    }

                    inventory_stock = stock;
                  }

                  selected_inventory.stock = inventory_stock;
                  const selected_inventory_save =
                    await selected_inventory?.save();

                  if (selected_purchases_returns_details) {
                    //update purchases_return details
                    selected_purchases_returns_details.name =
                      selected_inventory?.product?.name;
                    selected_purchases_returns_details.unit =
                      purchases_return_unit;
                    selected_purchases_returns_details.unit_name =
                      purchases_return_unit_name;
                    selected_purchases_returns_details.sale_price =
                      purchases_return_sale_price;
                    selected_purchases_returns_details.purchase_price =
                      purchases_return_purchase_price;
                    selected_purchases_returns_details.conversion =
                      purchases_return_conversion;
                    selected_purchases_returns_details.quantity =
                      purchases_return_quantity;
                    selected_purchases_returns_details.delivered =
                      purchases_return_delivered;
                    selected_purchases_returns_details.free =
                      purchases_return_free;
                    selected_purchases_returns_details.tax =
                      purchases_return_tax;
                    selected_purchases_returns_details.barcode =
                      purchases_return_barcode;
                    selected_purchases_returns_details.price_per_unit =
                      purchases_return_price_per_unit;
                    selected_purchases_returns_details.expiry_date =
                      purchases_return_expiry_date;
                    selected_purchases_returns_details.tax_amount = tax_amount;
                    selected_purchases_returns_details.total = total;
                    selected_purchases_returns_details.status = status
                      ? status
                      : 0;

                    const selected_purchases_returns_details_save =
                      await selected_purchases_returns_details?.save();

                    //inventory units details
                    if (selected_inventories_units_details?.length > 0) {
                      for (v of selected_inventories_units_details) {
                        if (v?._id == value?.unit) {
                          //inventory unit stock calculation for (sub unit)
                          let selected_inventory_unit_detail =
                            await inventories_units_details?.findById(v?._id);

                          if (selected_inventory_unit_detail) {
                            let unit_stock = parseFloat(
                              selected_inventory_unit_detail?.stock || 0
                            );

                            let previous_stock =
                              selected_purchases_returns_details?.delivered;

                            let current_stock =
                              parseFloat(value?.delivered || 0) -
                              parseFloat(previous_stock || 0);

                            if (
                              parseFloat(current_stock || 0) <=
                              parseFloat(unit_stock || 0)
                            ) {
                              unit_stock =
                                parseFloat(unit_stock || 0) -
                                parseFloat(current_stock || 0);
                            } else {
                              unit_stock = 0;
                            }

                            selected_inventory_unit_detail.stock = unit_stock;
                            const selected_inventory_unit_detail_save =
                              await selected_inventory_unit_detail?.save();
                          }
                        } else {
                          //inventory unit stock calculation for (main unit)
                          let selected_inventory_unit_detail =
                            await inventories_units_details?.findById(v?._id);

                          const selected_purchases_returns_units_details =
                            await purchases_returns_units_details?.findOne({
                              inventory_unit:
                                selected_inventory_unit_detail?._id,
                            });

                          let unit_stock = parseFloat(
                            selected_inventory_unit_detail?.stock || 0
                          );

                          let delivered = parseFloat(value?.delivered || 0);
                          let conversion = parseFloat(v?.conversion || 0);

                          let total_unit_stock =
                            parseFloat(delivered || 0) *
                            parseFloat(conversion || 0);

                          let previous_stock =
                            selected_purchases_returns_units_details?.unit_delivered;

                          let current_stock =
                            parseFloat(total_unit_stock || 0) -
                            parseFloat(previous_stock || 0);

                          if (
                            parseFloat(current_stock || 0) <=
                            parseFloat(unit_stock || 0)
                          ) {
                            unit_stock =
                              parseFloat(unit_stock || 0) -
                              parseFloat(current_stock || 0);
                          } else {
                            unit_stock = 0;
                          }

                          selected_inventory_unit_detail.stock = unit_stock;

                          const selected_inventory_unit_detail_save =
                            await selected_inventory_unit_detail?.save();

                          //purchases_return unit details
                          selected_purchases_returns_units_details.name =
                            v?.name;
                          selected_purchases_returns_units_details.quantity =
                            parseFloat(value?.quantity || 0) *
                            parseFloat(v?.conversion || 0);
                          selected_purchases_returns_units_details.purchase_price =
                            v?.price_per_unit;
                          selected_purchases_returns_units_details.price_per_unit =
                            v?.price_per_unit;
                          selected_purchases_returns_units_details.sale_price =
                            v?.sale_price;
                          selected_purchases_returns_units_details.conversion =
                            v?.conversion;
                          selected_purchases_returns_units_details.unit_quantity =
                            parseFloat(value?.quantity || 0) *
                            parseFloat(v?.conversion || 0);
                          selected_purchases_returns_units_details.unit_delivered =
                            total_unit_stock;
                          selected_purchases_returns_units_details.status =
                            status ? status : 0;

                          const selected_purchases_returns_units_details_save =
                            await selected_purchases_returns_units_details?.save();
                        }
                      }
                    }
                  } else {
                    //create purchases_return details
                    const purchases_return_detail =
                      new purchases_returns_details({
                        purchases_return: selected_purchases_return?._id,
                        description: selected_inventory?._id,
                        name: selected_inventory?.product?.name,
                        unit: purchases_return_unit,
                        unit_name: purchases_return_unit_name,
                        sale_price: purchases_return_sale_price,
                        purchase_price: purchases_return_purchase_price,
                        conversion: purchases_return_conversion,
                        quantity: purchases_return_quantity,
                        delivered: purchases_return_delivered,
                        free: purchases_return_free,
                        tax: purchases_return_tax,
                        barcode: purchases_return_barcode,
                        price_per_unit: purchases_return_price_per_unit,
                        expiry_date: purchases_return_expiry_date,
                        tax_amount: tax_amount,
                        total: total,
                        status: status ? status : 0,
                        ref: authorize?.ref,
                        branch: branch ? branch : authorize?.branch,
                        created: new Date(),
                        created_by: authorize?.id,
                      });
                    const purchases_return_detail_save =
                      await purchases_return_detail?.save();

                    //inventory units details
                    if (selected_inventories_units_details?.length > 0) {
                      for (v of selected_inventories_units_details) {
                        if (v?._id == value?.unit) {
                          let selected_inventory_unit_detail =
                            await inventories_units_details?.findById(v?._id);

                          if (selected_inventory_unit_detail) {
                            let unit_stock = parseFloat(
                              selected_inventory_unit_detail?.stock || 0
                            );

                            if (
                              parseFloat(value?.delivered || 0) <=
                              parseFloat(unit_stock || 0)
                            ) {
                              unit_stock =
                                parseFloat(unit_stock || 0) -
                                parseFloat(value?.delivered || 0);
                            } else {
                              unit_stock = 0;
                            }

                            selected_inventory_unit_detail.stock = unit_stock;
                            const selected_inventory_unit_detail_save =
                              await selected_inventory_unit_detail?.save();
                          }
                        } else {
                          let selected_inventory_unit_detail =
                            await inventories_units_details?.findById(v?._id);

                          let unit_stock = parseFloat(
                            selected_inventory_unit_detail?.stock || 0
                          );
                          let delivered = parseFloat(value?.delivered || 0);
                          let conversion = parseFloat(v?.conversion || 0);

                          let total_unit_stock =
                            parseFloat(delivered || 0) *
                            parseFloat(conversion || 0);

                          if (
                            parseFloat(total_unit_stock || 0) <=
                            parseFloat(unit_stock || 0)
                          ) {
                            unit_stock =
                              parseFloat(unit_stock || 0) -
                              parseFloat(total_unit_stock);
                          } else {
                            unit_stock = 0;
                          }

                          selected_inventory_unit_detail.stock = unit_stock;

                          const selected_inventory_unit_detail_save =
                            await selected_inventory_unit_detail?.save();

                          //purchases_return unit details
                          const purchases_return_unit_detail =
                            new purchases_returns_units_details({
                              details: purchases_return_detail_save?._id,
                              inventory_unit:
                                selected_inventory_unit_detail?._id,
                              name: v?.name,
                              quantity:
                                parseFloat(value?.quantity || 0) *
                                parseFloat(v?.conversion || 0),
                              purchase_price: v?.price_per_unit,
                              price_per_unit: v?.price_per_unit,
                              sale_price: v?.sale_price,
                              conversion: v?.conversion,
                              unit_quantity:
                                parseFloat(value?.quantity || 0) *
                                parseFloat(v?.conversion || 0),
                              unit_delivered: total_unit_stock,
                              status: status ? status : 0,
                              ref: authorize?.ref,
                              branch: branch ? branch : authorize?.branch,
                              created: new Date(),
                              created_by: authorize?.id,
                            });

                          const purchases_return_unit_detail_save =
                            purchases_return_unit_detail?.save();
                        }
                      }
                    }
                  }

                  purchases_return_subtotal =
                    parseFloat(purchases_return_subtotal) + parseFloat(price);
                  purchases_return_taxamount =
                    parseFloat(purchases_return_taxamount) +
                    parseFloat(tax_amount);
                  purchases_return_total =
                    parseFloat(purchases_return_total) + parseFloat(total);

                  count++;
                }
              }
            }

            if (count == details?.length) {
              if (selected_purchases_return) {
                //delivery status
                let data_delivery_status = delivery_status
                  ? parseFloat(delivery_status || 0)
                  : 0;
                let data_delivery_date = delivery_date ? delivery_date : "";

                if (parseFloat(data_delivery_status) == 2) {
                  if (
                    parseFloat(delivery_count) ==
                    purchases_return_details?.length
                  ) {
                    data_delivery_status = 2;
                  } else if (
                    parseFloat(delivery_count) > 0 &&
                    parseFloat(delivery_count) <
                      purchases_return_details?.length
                  ) {
                    data_delivery_status = 1;
                    data_delivery_date = "";
                  } else {
                    data_delivery_status = 0;
                    data_delivery_date = "";
                  }
                }

                //grand total
                let purchases_return_discount = 0;
                if (discount) {
                  if (discount <= purchases_return_total) {
                    purchases_return_discount = discount;
                  }
                }

                let purchases_return_delivery = delivery ? delivery : 0;

                let grand_total =
                  parseFloat(purchases_return_total) +
                  parseFloat(purchases_return_delivery) -
                  parseFloat(purchases_return_discount);

                //payment status
                let purchases_return_payment_types = payment_types
                  ? JSON?.parse(payment_types)
                  : "";
                let purchases_return_payments = payments
                  ? JSON?.parse(payments)
                  : "";

                let purchases_return_paid = 0;
                let purchases_return_payment_details = [];
                if (purchases_return_payment_types?.length > 0) {
                  for (value of purchases_return_payment_types) {
                    let purchases_return_payment_id = purchases_return_payments[
                      value
                    ]?.id
                      ? purchases_return_payments[value]?.id
                      : "";
                    let purchases_return_payment_amount =
                      purchases_return_payments[value]?.amount
                        ? parseFloat(purchases_return_payments[value]?.amount)
                        : 0;

                    purchases_return_paid =
                      parseFloat(purchases_return_paid) +
                      parseFloat(purchases_return_payment_amount);

                    purchases_return_payment_details?.push({
                      id: purchases_return_payment_id,
                      name: value,
                      amount: purchases_return_payment_amount,
                    });
                  }
                }

                let data_payment_status = payment_status
                  ? parseFloat(payment_status || 0)
                  : 0;
                if (parseFloat(data_payment_status) == 2) {
                  if (
                    parseFloat(purchases_return_paid) == parseFloat(grand_total)
                  ) {
                    data_payment_status = 2;
                  } else if (
                    parseFloat(purchases_return_paid) > 0 &&
                    parseFloat(purchases_return_paid) < parseFloat(grand_total)
                  ) {
                    data_payment_status = 1;
                  } else {
                    purchases_return_payment_details = [];
                    data_payment_status = 0;
                  }
                }

                //order payment
                if (purchases_return_payment_details?.length > 0) {
                  for (value of purchases_return_payment_details) {
                    const purchases_return_payment =
                      await purchases_returns_payments({
                        purchases_return: purchases_return_save?._id,
                        name: value?.name,
                        amount: value?.amount,
                        status: status ? status : 0,
                        ref: authorize?.ref,
                        branch: branch ? branch : authorize?.branch,
                        created: new Date(),
                        created_by: authorize?.id,
                      });

                    const purchases_return_payment_save =
                      await purchases_return_payment?.save();
                  }
                }

                selected_purchases_return.supplier = supplier;
                selected_purchases_return.subtotal = purchases_return_subtotal
                  ? purchases_return_subtotal
                  : 0;
                selected_purchases_return.taxamount = purchases_return_taxamount
                  ? purchases_return_taxamount
                  : 0;
                selected_purchases_return.discount = purchases_return_discount
                  ? purchases_return_discount
                  : 0;
                selected_purchases_return.delivery = purchases_return_delivery
                  ? purchases_return_delivery
                  : 0;
                selected_purchases_return.delivery_status = data_delivery_status
                  ? data_delivery_status
                  : 0;
                selected_purchases_return.delivery_date = data_delivery_date;
                selected_purchases_return.payment_status = data_payment_status
                  ? data_payment_status
                  : 0;
                selected_purchases_return.total = grand_total ? grand_total : 0;
                selected_purchases_return.status = status ? status : 0;

                const selected_purchases_return_save =
                  await selected_purchases_return?.save();

                success_200(res, "Purchase return created");
              } else {
                failed_400(res, "Purchase return failed");
              }
            } else {
              failed_400(res, "Purchase return failed");
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

const delete_purchases_return = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_purchases_return = await purchases_returns?.findById(id);

        if (
          !selected_purchases_return ||
          selected_purchases_return?.status == 2
        ) {
          failed_400(res, "Purchase return Order not found");
        } else {
          selected_purchases_return.status = 2;
          const delete_purchases_return =
            await selected_purchases_return?.save();

          success_200(res, "Purchase return Order deleted");
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_purchases_return = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_purchases_return = await purchases_returns
          ?.findById(id)
          ?.populate("supplier")
          ?.populate("branch");

        if (
          !selected_purchases_return ||
          selected_purchases_return?.status == 2
        ) {
          failed_400(res, "purchases_return Order not found");
        } else {
          const selected_purchases_returns_payments =
            await purchases_returns_payments?.find({
              purchases_return: selected_purchases_return?._id,
            });

          const selected_purchases_return_details =
            await purchases_returns_details
              ?.find({
                purchases_return: selected_purchases_return?._id,
              })
              ?.populate({
                path: "description",
                match: { status: { $ne: 2 } },
              });

          let purchases_return_details_and_units = [];

          for (value of selected_purchases_return_details) {
            let details = value?.toObject();

            let selected_inventory_unit_details =
              await inventories_units_details?.find({
                inventory: value?.description?._id,
              });

            const selected_purchases_return_details_units =
              await purchases_returns_units_details?.find({
                details: value?._id,
              });
            // ?.sort({ created: 1 });

            purchases_return_details_and_units?.push({
              ...details,
              unit_details_options: selected_purchases_return_details_units,
              inventory_unit_details: selected_inventory_unit_details,
            });
          }

          const purchases_returnData = selected_purchases_return?.toObject();

          success_200(res, "", {
            ...purchases_returnData,
            payments: selected_purchases_returns_payments,
            details: purchases_return_details_and_units,
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

const get_all_purchases_returns = async (req, res) => {
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

    const purchases_returnsList = {
      branch: authorize?.branch,
      status: { $ne: 2 },
    };

    // Apply filters based on request body
    if (search) {
      purchases_returnsList.$or = [
        { number: { $regex: search, $options: "i" } },
      ];
    }
    if (supplier) purchases_returnsList.supplier = supplier;
    if (contractor) purchases_returnsList.contractor = contractor;
    if (status == 0) purchases_returnsList.status = status;

    if (date?.start && date?.end) {
      purchases_returnsList.date = {
        $gte: new Date(date?.start),
        $lte: new Date(date?.end),
      };
    }

    if (due_date?.start && due_date?.end) {
      purchases_returnsList.due_date = {
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
    const totalCount = await purchases_returns.countDocuments(
      purchases_returnsList
    );

    // Fetch paginated data
    const paginated_purchases_returns = await purchases_returns
      .find(purchases_returnsList)
      .sort(sortOption)
      .skip((page_number - 1) * page_limit)
      .limit(page_limit)
      .populate("supplier");

    const totalPages = Math.ceil(totalCount / page_limit);

    success_200(res, "", {
      currentPage: page_number,
      totalPages,
      totalCount,
      data: paginated_purchases_returns,
    });
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_purchases_returns_details = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { search, supplier, contractor, status, date, due_date, sort } =
        req?.body;

      const purchases_returnsList = { branch: authorize?.branch };
      purchases_returnsList.status = { $ne: 2 };

      // Apply filters based on request body
      search &&
        (purchases_returnsList.$or = [
          { number: { $regex: search, $options: "i" } },
        ]);
      supplier && (purchases_returnsList.supplier = supplier);
      contractor && (purchases_returnsList.supplier = contractor);
      status == 0 && (purchases_returnsList.status = status);

      // Set sorting options
      let sortOption = { created: -1 };
      if (sort == 0) {
        sortOption = { total: 1 };
      } else if (sort == 1) {
        sortOption = { total: -1 };
      }

      if (date?.start && date?.end) {
        purchases_returnsList.date = {
          $gte: new Date(date?.start),
          $lte: new Date(date?.end),
        };
      }

      // due_date
      if (due_date?.start && due_date?.end) {
        purchases_returnsList.due_date = {
          $gte: new Date(due_date?.start),
          $lte: new Date(due_date?.end),
        };
      }

      const all_purchases_returns = await purchases_returns_details
        .find(purchases_returnsList)
        .sort(sortOption);
      // ?.populate("supplier");

      success_200(res, "", all_purchases_returns);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_purchases_return_log = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_purchases_return_log =
          await purchases_returns_log?.findById(id);

        if (!selected_purchases_return_log) {
          failed_400(res, "purchases_return not found");
        } else {
          success_200(res, "", selected_purchases_return_log);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_purchases_returns_log = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { purchases_return } = req?.body;

      if (!purchases_return) {
        incomplete_400(res);
      } else {
        const all_purchases_returns_log = await purchases_returns_log?.find({
          purchases_return: purchases_return,
        });
        success_200(res, "", all_purchases_returns_log);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_purchases_return_details = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_purchases_return_detail = await purchases_returns_details
          .find({ description: id, status: 1 })
          .populate({
            path: "purchases_return",
            match: { status: 1 },
            populate: { path: "supplier" },
          });

        selected_purchases_return_detail.sort((a, b) => {
          const dateA = new Date(a.purchases_return?.date);
          const dateB = new Date(b.purchases_return?.date);
          return dateB - dateA;
        });

        success_200(res, "", selected_purchases_return_detail);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_purchases_return,
  update_purchases_return,
  delete_purchases_return,
  get_purchases_return,
  get_all_purchases_returns,
  get_all_purchases_returns_details,
  get_all_purchases_return_details,
  get_purchases_return_log,
  get_all_purchases_returns_log,
};
