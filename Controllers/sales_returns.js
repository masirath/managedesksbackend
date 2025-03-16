const { authorization } = require("../Global/authorization");
const {
  failed_400,
  unauthorized,
  catch_400,
  incomplete_400,
  success_200,
} = require("../Global/errors");
const sales_returns = require("../Models/sales_returns");
const { checknull } = require("../Global/checknull");
const inventories = require("../Models/inventories");
const sales_returns_details = require("../Models/sales_returns_details");
const sales_returns_log = require("../Models/sales_returns_log");
const sales_returns_details_log = require("../Models/sales_returns_details_log");
const sales_returns_units_details = require("../Models/sales_returns_units_details");
const sales_returns_payments = require("../Models/sales_returns_payments");
const inventories_units_details = require("../Models/inventories_units_details");
const sales_returns_payments_log = require("../Models/sales_returns_payments_log");
const sales_returns_units_details_log = require("../Models/sales_returns_units_details_log");
const inventories_log = require("../Models/inventories_log");
const inventories_units_details_log = require("../Models/inventories_units_details_log");
const { default: mongoose } = require("mongoose");

const get_next_sales_return = async (req, res, number) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const total_sales_return = await sales_returns.countDocuments({
        branch: authorize?.branch,
      });

      const next_sales_return_number = number + total_sales_return;

      const existing_sales_return_number = await sales_returns.findOne({
        number: next_sales_return_number,
        branch: authorize?.branch,
      });

      if (existing_sales_return_number) {
        return await get_next_sales_return(req, res, next_sales_return_number);
      } else {
        return next_sales_return_number;
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

const create_sales_return = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const {
        customer,
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

      let new_number = await get_next_sales_return(req, res, 1000);
      let assigned_number = number ? number : new_number;

      if (
        // !customer ||
        !assigned_number ||
        !date ||
        !due_date ||
        !details?.length > 0
      ) {
        incomplete_400(res);
      } else {
        const selected_sales_return_number = await sales_returns?.findOne({
          number: assigned_number,
          branch: branch ? branch : authorize?.branch,
        });

        if (selected_sales_return_number) {
          failed_400(res, "Sales return number exists");
        } else {
          //create sales_return
          const sales_return = new sales_returns({
            customer: customer,
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

          const sales_return_save = await sales_return?.save();

          //sales_return details
          let sales_return_details = [];
          let sales_return_subtotal = 0;
          let sales_return_taxamount = 0;
          let sales_return_total = 0;
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
                let sales_return_unit = value?.unit ? value?.unit : "";
                let sales_return_unit_name = value?.unit_name
                  ? value?.unit_name
                  : "";
                let sales_return_sale_price =
                  selected_inventory?._id == value?.unit
                    ? selected_inventory?.sale_price
                      ? selected_inventory?.sale_price
                      : 0
                    : selected_unit?.sale_price
                    ? selected_unit?.sale_price
                    : 0;
                let sales_return_purchase_price =
                  selected_inventory?._id == value?.unit
                    ? selected_inventory?.purchase_price
                      ? selected_inventory?.purchase_price
                      : 0
                    : selected_unit?.purchase_price
                    ? selected_unit?.purchase_price
                    : 0;
                let sales_return_price_per_unit =
                  selected_inventory?._id == value?.unit
                    ? selected_inventory?.price_per_unit
                      ? selected_inventory?.price_per_unit
                      : 0
                    : selected_unit?.price_per_unit
                    ? selected_unit?.price_per_unit
                    : 0;
                let sales_return_conversion =
                  selected_inventory?._id == value?.unit
                    ? selected_inventory?.conversion
                      ? selected_inventory?.conversion
                      : 0
                    : selected_unit?.conversion
                    ? selected_unit?.conversion
                    : 0;
                let sales_return_quantity = value?.quantity
                  ? value?.quantity
                  : 0;
                let sales_return_delivered = value?.delivered
                  ? value?.delivered
                  : 0;
                let sales_return_free = value?.free ? value?.free : 0;
                let sales_return_tax = selected_inventory?.tax
                  ? selected_inventory?.tax
                  : 0;
                let sales_return_barcode = selected_inventory?.barcode
                  ? selected_inventory?.barcode
                  : "";
                let sales_return_expiry_date = selected_inventory?.expiry_date
                  ? selected_inventory?.expiry_date
                  : "";

                let price =
                  parseFloat(sales_return_quantity) *
                  parseFloat(sales_return_sale_price);
                let tax_amount =
                  parseFloat(price) * (parseFloat(sales_return_tax) / 100);
                let total = parseFloat(price) + parseFloat(tax_amount);

                let total_quantity =
                  parseFloat(sales_return_quantity) +
                  parseFloat(sales_return_free);
                sales_return_delivered =
                  parseFloat(sales_return_delivered) <=
                  parseFloat(total_quantity)
                    ? sales_return_delivered
                    : total_quantity;

                //delivery status count
                if (
                  parseFloat(total_quantity) ==
                  parseFloat(sales_return_delivered)
                ) {
                  delivery_count++;
                }

                //inventories create (stock calculation)
                let inventory_stock = 0;
                if (selected_inventory?._id == value?.unit) {
                  //if main unit
                  let stock = parseFloat(selected_inventory?.stock || 0);

                  stock =
                    parseFloat(selected_inventory?.stock || 0) +
                    parseFloat(value?.delivered || 0);

                  inventory_stock = stock;
                } else {
                  //if sub unit
                  let stock = parseFloat(selected_inventory?.stock || 0);
                  let delivered = parseFloat(value?.delivered || 0);
                  let conversion = parseFloat(selected_unit?.conversion || 0);

                  let total_unit_stock =
                    parseFloat(delivered || 0) / parseFloat(conversion || 0);

                  stock =
                    parseFloat(stock || 0) + parseFloat(total_unit_stock || 0);

                  inventory_stock = stock;
                }

                selected_inventory.stock = inventory_stock;
                const selected_inventory_save =
                  await selected_inventory?.save();

                //sales_return details create
                const sales_return_detail = new sales_returns_details({
                  sales_return: sales_return_save?._id,
                  description: selected_inventory?._id,
                  name: selected_inventory?.product?.name,
                  unit: sales_return_unit,
                  unit_name: sales_return_unit_name,
                  sale_price: sales_return_sale_price,
                  purchase_price: sales_return_purchase_price,
                  conversion: sales_return_conversion,
                  quantity: sales_return_quantity,
                  delivered: sales_return_delivered,
                  free: sales_return_free,
                  tax: sales_return_tax,
                  barcode: sales_return_barcode,
                  price_per_unit: sales_return_price_per_unit,
                  expiry_date: sales_return_expiry_date,
                  tax_amount: tax_amount,
                  total: total,
                  status: status ? status : 0,
                  ref: authorize?.ref,
                  branch: branch ? branch : authorize?.branch,
                  created: new Date(),
                  created_by: authorize?.id,
                });
                const sales_return_detail_save =
                  await sales_return_detail?.save();

                //inventory units details
                if (selected_inventories_units_details?.length > 0) {
                  for (v of selected_inventories_units_details) {
                    if (v?._id == value?.unit) {
                      //sub units
                      let selected_inventory_unit_detail =
                        await inventories_units_details?.findById(v?._id);

                      if (selected_inventory_unit_detail) {
                        let unit_stock = parseFloat(
                          selected_inventory_unit_detail?.stock || 0
                        );

                        unit_stock =
                          parseFloat(unit_stock || 0) +
                          parseFloat(value?.delivered || 0);

                        selected_inventory_unit_detail.stock = unit_stock;
                        const selected_inventory_unit_detail_save =
                          await selected_inventory_unit_detail?.save();
                      }
                    } else {
                      //main unit
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

                      unit_stock =
                        parseFloat(unit_stock || 0) +
                        parseFloat(total_unit_stock);

                      selected_inventory_unit_detail.stock = unit_stock;

                      const selected_inventory_unit_detail_save =
                        await selected_inventory_unit_detail?.save();

                      //sales_return unit details
                      const sales_return_unit_detail =
                        new sales_returns_units_details({
                          details: sales_return_detail_save?._id,
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

                      const sales_return_unit_detail_save =
                        sales_return_unit_detail?.save();
                    }
                  }
                }

                sales_return_subtotal =
                  parseFloat(sales_return_subtotal) + parseFloat(price);
                sales_return_taxamount =
                  parseFloat(sales_return_taxamount) + parseFloat(tax_amount);
                sales_return_total =
                  parseFloat(sales_return_total) + parseFloat(total);

                count++;
              }
            }
          }

          if (count == details?.length) {
            const selected_sales_return = await sales_returns?.findById(
              sales_return_save?._id
            );

            if (selected_sales_return) {
              //delivery status
              let data_delivery_status = delivery_status
                ? parseFloat(delivery_status || 0)
                : 0;
              let data_delivery_date = delivery_date ? delivery_date : "";

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

              //grand total
              let sales_return_discount = 0;
              if (discount) {
                if (discount <= sales_return_total) {
                  sales_return_discount = discount;
                }
              }

              let sales_return_delivery = delivery ? delivery : 0;

              let grand_total =
                parseFloat(sales_return_total) +
                parseFloat(sales_return_delivery) -
                parseFloat(sales_return_discount);

              //payment status
              let sales_return_payment_types = payment_types
                ? JSON?.parse(payment_types)
                : "";
              let sales_return_payments = payments ? JSON?.parse(payments) : "";

              let sales_return_paid = 0;
              let sales_return_payment_details = [];
              if (sales_return_payment_types?.length > 0) {
                for (value of sales_return_payment_types) {
                  let sales_return_payment_id = sales_return_payments[value]?.id
                    ? sales_return_payments[value]?.id
                    : "";
                  let sales_return_payment_amount = sales_return_payments[value]
                    ?.amount
                    ? parseFloat(sales_return_payments[value]?.amount)
                    : 0;

                  sales_return_paid =
                    parseFloat(sales_return_paid) +
                    parseFloat(sales_return_payment_amount);

                  sales_return_payment_details?.push({
                    id: sales_return_payment_id,
                    name: value,
                    amount: sales_return_payment_amount,
                  });
                }
              }

              let data_payment_status = payment_status
                ? parseFloat(payment_status || 0)
                : 0;
              if (
                parseFloat(sales_return_paid?.toFixed(3) || 0) ==
                parseFloat(grand_total?.toFixed(3) || 0)
              ) {
                data_payment_status = 2;
              } else if (
                parseFloat(sales_return_paid?.toFixed(3) || 0) > 0 &&
                parseFloat(sales_return_paid?.toFixed(3) || 0) <
                  parseFloat(grand_total?.toFixed(3) || 0)
              ) {
                data_payment_status = 1;
              } else {
                sales_return_payment_details = [];
                data_payment_status = 0;
              }

              //order payment
              if (sales_return_payment_details?.length > 0) {
                for (value of sales_return_payment_details) {
                  const sales_return_payment = await sales_returns_payments({
                    sales_return: sales_return_save?._id,
                    name: value?.name,
                    amount: value?.amount,
                    status: status ? status : 0,
                    ref: authorize?.ref,
                    branch: branch ? branch : authorize?.branch,
                    created: new Date(),
                    created_by: authorize?.id,
                  });

                  const sales_return_payment_save =
                    await sales_return_payment?.save();
                }
              }

              selected_sales_return.subtotal = sales_return_subtotal
                ? sales_return_subtotal
                : 0;
              selected_sales_return.taxamount = sales_return_taxamount
                ? sales_return_taxamount
                : 0;
              selected_sales_return.discount = sales_return_discount
                ? sales_return_discount
                : 0;
              selected_sales_return.delivery = sales_return_delivery
                ? sales_return_delivery
                : 0;
              selected_sales_return.delivery_status = data_delivery_status
                ? data_delivery_status
                : 0;
              selected_sales_return.delivery_date = data_delivery_date;
              selected_sales_return.payment_status = data_payment_status
                ? data_payment_status
                : 0;
              selected_sales_return.total = grand_total ? grand_total : 0;

              const selected_sales_return_save =
                await selected_sales_return?.save();

              success_200(res, "Sales return created");
            } else {
              failed_400(res, "Sales return failed");
            }
          } else {
            failed_400(res, "Sales return failed");
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

const update_sales_return = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const {
        id,
        customer,
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

      let new_number = await get_next_sales_return(req, res, 1000);
      let assigned_number = number ? number : new_number;

      if (
        // !customer ||
        !id ||
        !assigned_number ||
        !date ||
        !due_date ||
        !details?.length > 0
      ) {
        incomplete_400(res);
      } else {
        const selected_sales_return = await sales_returns?.findById(id);

        if (!selected_sales_return || selected_sales_return?.status == 2) {
          failed_400(res, "Sales return Order not found");
        } else {
          const selected_sales_return_number = await sales_returns?.findOne({
            _id: { $ne: id },
            number: assigned_number,
            branch: branch ? branch : authorize?.branch,
          });

          if (selected_sales_return_number) {
            failed_400(res, "Sales return number exists");
          } else {
            //sales_return details
            let sales_return_details = [];
            let sales_return_subtotal = 0;
            let sales_return_taxamount = 0;
            let sales_return_total = 0;
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
                  let sales_return_unit = value?.unit ? value?.unit : "";
                  let sales_return_unit_name = value?.unit_name
                    ? value?.unit_name
                    : "";
                  let sales_return_sale_price =
                    selected_inventory?._id == value?.unit
                      ? selected_inventory?.sale_price
                        ? selected_inventory?.sale_price
                        : 0
                      : selected_unit?.sale_price
                      ? selected_unit?.sale_price
                      : 0;
                  let sales_return_purchase_price =
                    selected_inventory?._id == value?.unit
                      ? selected_inventory?.purchase_price
                        ? selected_inventory?.purchase_price
                        : 0
                      : selected_unit?.purchase_price
                      ? selected_unit?.purchase_price
                      : 0;
                  let sales_return_price_per_unit =
                    selected_inventory?._id == value?.unit
                      ? selected_inventory?.price_per_unit
                        ? selected_inventory?.price_per_unit
                        : 0
                      : selected_unit?.price_per_unit
                      ? selected_unit?.price_per_unit
                      : 0;
                  let sales_return_conversion =
                    selected_inventory?._id == value?.unit
                      ? selected_inventory?.conversion
                        ? selected_inventory?.conversion
                        : 0
                      : selected_unit?.conversion
                      ? selected_unit?.conversion
                      : 0;
                  let sales_return_quantity = value?.quantity
                    ? value?.quantity
                    : 0;
                  let sales_return_delivered = value?.delivered
                    ? value?.delivered
                    : 0;
                  let sales_return_free = value?.free ? value?.free : 0;
                  let sales_return_tax = selected_inventory?.tax
                    ? selected_inventory?.tax
                    : 0;
                  let sales_return_barcode = selected_inventory?.barcode
                    ? selected_inventory?.barcode
                    : "";
                  let sales_return_expiry_date = selected_inventory?.expiry_date
                    ? selected_inventory?.expiry_date
                    : "";

                  let price =
                    parseFloat(sales_return_quantity) *
                    parseFloat(sales_return_sale_price);
                  let tax_amount =
                    parseFloat(price) * (parseFloat(sales_return_tax) / 100);
                  let total = parseFloat(price) + parseFloat(tax_amount);

                  let total_quantity =
                    parseFloat(sales_return_quantity) +
                    parseFloat(sales_return_free);
                  sales_return_delivered =
                    parseFloat(sales_return_delivered) <=
                    parseFloat(total_quantity)
                      ? sales_return_delivered
                      : total_quantity;

                  //delivery status count
                  if (
                    parseFloat(total_quantity) ==
                    parseFloat(sales_return_delivered)
                  ) {
                    delivery_count++;
                  }

                  const selected_sales_returns_details =
                    await sales_returns_details?.findOne({
                      description: selected_inventory?._id,
                    });

                  //inventories create (stock calculation)
                  let inventory_stock = 0;
                  if (selected_inventory?._id == value?.unit) {
                    let stock = parseFloat(selected_inventory?.stock || 0);

                    let previous_stock =
                      selected_sales_returns_details?.delivered;

                    let current_stock =
                      parseFloat(value?.delivered || 0) -
                      parseFloat(previous_stock || 0);

                    stock =
                      parseFloat(selected_inventory?.stock || 0) +
                      parseFloat(current_stock || 0);

                    inventory_stock = stock;
                  } else {
                    //if sub unit
                    let stock = parseFloat(selected_inventory?.stock || 0);
                    let delivered = parseFloat(value?.delivered || 0);
                    let conversion = parseFloat(selected_unit?.conversion || 0);

                    let total_unit_stock =
                      parseFloat(delivered || 0) / parseFloat(conversion || 0);

                    let previous_stock =
                      parseFloat(
                        selected_sales_returns_details?.delivered || 0
                      ) / parseFloat(conversion || 0);

                    let current_stock =
                      parseFloat(total_unit_stock || 0) -
                      parseFloat(previous_stock || 0);

                    stock =
                      parseFloat(stock || 0) + parseFloat(current_stock || 0);

                    inventory_stock = stock;
                  }

                  selected_inventory.stock = inventory_stock;
                  const selected_inventory_save =
                    await selected_inventory?.save();

                  if (selected_sales_returns_details) {
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
                              selected_inventory_unit_detail?.delivered;

                            let current_stock =
                              parseFloat(value?.delivered || 0) -
                              parseFloat(previous_stock || 0);

                            unit_stock =
                              parseFloat(unit_stock || 0) +
                              parseFloat(current_stock || 0);

                            selected_inventory_unit_detail.stock = unit_stock;
                            const selected_inventory_unit_detail_save =
                              await selected_inventory_unit_detail?.save();
                          }
                        } else {
                          //inventory unit stock calculation for (main unit)
                          let selected_inventory_unit_detail =
                            await inventories_units_details?.findById(v?._id);

                          const selected_sales_returns_units_detail =
                            await sales_returns_units_details?.findOne({
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
                            selected_sales_returns_units_detail?.unit_delivered;

                          let current_stock =
                            parseFloat(total_unit_stock || 0) -
                            parseFloat(previous_stock || 0);

                          unit_stock =
                            parseFloat(unit_stock || 0) +
                            parseFloat(current_stock || 0);

                          selected_inventory_unit_detail.stock = unit_stock;

                          const selected_inventory_unit_detail_save =
                            await selected_inventory_unit_detail?.save();

                          const selected_sales_returns_units_details =
                            await sales_returns_units_details?.findOne({
                              inventory_unit:
                                selected_inventory_unit_detail?._id,
                            });

                          //sales_return unit details
                          selected_sales_returns_units_details.name = v?.name;
                          selected_sales_returns_units_details.quantity =
                            parseFloat(value?.quantity || 0) *
                            parseFloat(v?.conversion || 0);
                          selected_sales_returns_units_details.purchase_price =
                            v?.price_per_unit;
                          selected_sales_returns_units_details.price_per_unit =
                            v?.price_per_unit;
                          selected_sales_returns_units_details.sale_price =
                            v?.sale_price;
                          selected_sales_returns_units_details.conversion =
                            v?.conversion;
                          selected_sales_returns_units_details.unit_quantity =
                            parseFloat(value?.quantity || 0) *
                            parseFloat(v?.conversion || 0);
                          selected_sales_returns_units_details.unit_delivered =
                            total_unit_stock;
                          selected_sales_returns_units_details.status = status
                            ? status
                            : 0;

                          const selected_sales_returns_units_details_save =
                            selected_sales_returns_units_details?.save();
                        }
                      }
                    }

                    //update sales_return details
                    selected_sales_returns_details.name =
                      selected_inventory?.product?.name;
                    selected_sales_returns_details.unit = sales_return_unit;
                    selected_sales_returns_details.unit_name =
                      sales_return_unit_name;
                    selected_sales_returns_details.sale_price =
                      sales_return_sale_price;
                    selected_sales_returns_details.purchase_price =
                      sales_return_purchase_price;
                    selected_sales_returns_details.conversion =
                      sales_return_conversion;
                    selected_sales_returns_details.quantity =
                      sales_return_quantity;
                    selected_sales_returns_details.delivered =
                      sales_return_delivered;
                    selected_sales_returns_details.free = sales_return_free;
                    selected_sales_returns_details.tax = sales_return_tax;
                    selected_sales_returns_details.barcode =
                      sales_return_barcode;
                    selected_sales_returns_details.price_per_unit =
                      sales_return_price_per_unit;
                    selected_sales_returns_details.expiry_date =
                      sales_return_expiry_date;
                    selected_sales_returns_details.tax_amount = tax_amount;
                    selected_sales_returns_details.total = total;
                    selected_sales_returns_details.status = status ? status : 0;

                    const selected_sales_returns_details_save =
                      await selected_sales_returns_details?.save();
                  } else {
                    //create sales_return details
                    const sales_return_detail = new sales_returns_details({
                      sales_return: selected_sales_return?._id,
                      description: selected_inventory?._id,
                      name: selected_inventory?.product?.name,
                      unit: sales_return_unit,
                      unit_name: sales_return_unit_name,
                      sale_price: sales_return_sale_price,
                      purchase_price: sales_return_purchase_price,
                      conversion: sales_return_conversion,
                      quantity: sales_return_quantity,
                      delivered: sales_return_delivered,
                      free: sales_return_free,
                      tax: sales_return_tax,
                      barcode: sales_return_barcode,
                      price_per_unit: sales_return_price_per_unit,
                      expiry_date: sales_return_expiry_date,
                      tax_amount: tax_amount,
                      total: total,
                      status: status ? status : 0,
                      ref: authorize?.ref,
                      branch: branch ? branch : authorize?.branch,
                      created: new Date(),
                      created_by: authorize?.id,
                    });
                    const sales_return_detail_save =
                      await sales_return_detail?.save();

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

                            unit_stock =
                              parseFloat(unit_stock || 0) +
                              parseFloat(value?.delivered || 0);
                          } else {
                            unit_stock = 0;

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

                          unit_stock =
                            parseFloat(unit_stock || 0) +
                            parseFloat(total_unit_stock);

                          selected_inventory_unit_detail.stock = unit_stock;

                          const selected_inventory_unit_detail_save =
                            await selected_inventory_unit_detail?.save();

                          //sales_return unit details
                          const sales_return_unit_detail =
                            new sales_returns_units_details({
                              details: sales_return_detail_save?._id,
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

                          const sales_return_unit_detail_save =
                            sales_return_unit_detail?.save();
                        }
                      }
                    }
                  }

                  sales_return_subtotal =
                    parseFloat(sales_return_subtotal) + parseFloat(price);
                  sales_return_taxamount =
                    parseFloat(sales_return_taxamount) + parseFloat(tax_amount);
                  sales_return_total =
                    parseFloat(sales_return_total) + parseFloat(total);

                  count++;
                }
              }
            }

            if (count == details?.length) {
              if (selected_sales_return) {
                //delivery status
                let data_delivery_status = delivery_status
                  ? parseFloat(delivery_status || 0)
                  : 0;
                let data_delivery_date = delivery_date
                  ? delivery_date
                  : new Date();

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

                //grand total
                let sales_return_discount = 0;
                if (discount) {
                  if (discount <= sales_return_total) {
                    sales_return_discount = discount;
                  }
                }

                let sales_return_delivery = delivery ? delivery : 0;

                let grand_total =
                  parseFloat(sales_return_total) +
                  parseFloat(sales_return_delivery) -
                  parseFloat(sales_return_discount);

                //payment status
                const delete_sales_returns_payments =
                  await sales_returns_payments?.deleteMany({
                    sales_return: id,
                  });

                let sales_return_payment_types = payment_types
                  ? JSON?.parse(payment_types)
                  : "";
                let sales_return_payments = payments
                  ? JSON?.parse(payments)
                  : "";

                let sales_return_paid = 0;
                let sales_return_payment_details = [];
                if (sales_return_payment_types?.length > 0) {
                  for (value of sales_return_payment_types) {
                    let sales_return_payment_id = sales_return_payments[value]
                      ?.id
                      ? sales_return_payments[value]?.id
                      : "";
                    let sales_return_payment_amount = sales_return_payments[
                      value
                    ]?.amount
                      ? parseFloat(sales_return_payments[value]?.amount)
                      : 0;

                    sales_return_paid =
                      parseFloat(sales_return_paid) +
                      parseFloat(sales_return_payment_amount);

                    sales_return_payment_details?.push({
                      id: sales_return_payment_id,
                      name: value,
                      amount: sales_return_payment_amount,
                    });
                  }
                }

                let data_payment_status = payment_status
                  ? parseFloat(payment_status || 0)
                  : 0;

                if (
                  parseFloat(sales_return_paid?.toFixed(3) || 0) ==
                  parseFloat(grand_total?.toFixed(3) || 0)
                ) {
                  data_payment_status = 2;
                } else if (
                  parseFloat(sales_return_paid) > 0 &&
                  parseFloat(sales_return_paid) < parseFloat(grand_total)
                ) {
                  data_payment_status = 1;
                } else {
                  sales_return_payment_details = [];
                  data_payment_status = 0;
                }

                //order payment
                if (sales_return_payment_details?.length > 0) {
                  for (value of sales_return_payment_details) {
                    const sales_return_payment = await sales_returns_payments({
                      sales_return: selected_sales_return?._id,
                      name: value?.name,
                      amount: value?.amount,
                      status: status ? status : 0,
                      ref: authorize?.ref,
                      branch: branch ? branch : authorize?.branch,
                      created: new Date(),
                      created_by: authorize?.id,
                    });

                    const sales_return_payment_save =
                      await sales_return_payment?.save();
                  }
                }

                selected_sales_return.subtotal = sales_return_subtotal
                  ? sales_return_subtotal
                  : 0;
                selected_sales_return.taxamount = sales_return_taxamount
                  ? sales_return_taxamount
                  : 0;
                selected_sales_return.discount = sales_return_discount
                  ? sales_return_discount
                  : 0;
                selected_sales_return.delivery = sales_return_delivery
                  ? sales_return_delivery
                  : 0;
                selected_sales_return.delivery_status = data_delivery_status
                  ? data_delivery_status
                  : 0;
                selected_sales_return.delivery_date = data_delivery_date;
                selected_sales_return.payment_status = data_payment_status
                  ? data_payment_status
                  : 0;
                selected_sales_return.total = grand_total ? grand_total : 0;

                const selected_sales_return_save =
                  await selected_sales_return?.save();

                success_200(res, "Sales return created");
              } else {
                failed_400(res, "Sales return failed");
              }
            } else {
              failed_400(res, "Sales return failed");
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

const delete_sales_return = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_sales_return = await sales_returns?.findById(id);

        if (!selected_sales_return || selected_sales_return?.status == 2) {
          failed_400(res, "sales_return Order not found");
        } else {
          // const sales_return_log = new sales_returns_log({
          //   sales_return: id,
          //   customer: selected_sales_return?.customer,
          //   number: selected_sales_return?.number,
          //   date: selected_sales_return?.date,
          //   due_date: selected_sales_return?.due_date,
          //   subtotal: selected_sales_return?.subtotal,
          //   taxamount: selected_sales_return?.taxamount,
          //   discount: selected_sales_return?.discount,
          //   delivery: selected_sales_return?.delivery,
          //   delivery_status: selected_sales_return?.delivery_status,
          //   delivery_date: selected_sales_return?.delivery_date,
          //   payment_status: selected_sales_return?.payment_status,
          //   payment_types: selected_sales_return?.payment_types,
          //   payments: selected_sales_return?.payments,
          //   paid: selected_sales_return?.paid,
          //   remaining: selected_sales_return?.remaining,
          //   total: selected_sales_return?.total,
          //   status: selected_sales_return?.status,
          //   ref: selected_sales_return?.ref,
          //   branch: selected_sales_return?.branch,
          //   updated: new Date(),
          //   updated_by: authorize?.id,
          // });
          // const sales_return_log_save = await sales_return_log?.save();

          selected_sales_return.status = 2;
          const delete_sales_return = await selected_sales_return?.save();

          success_200(res, "sales_return Order deleted");
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_sales_return = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_sales_return = await sales_returns
          ?.findById(id)
          ?.populate("customer")
          ?.populate("branch");

        if (!selected_sales_return || selected_sales_return?.status == 2) {
          failed_400(res, "sales_return Order not found");
        } else {
          const selected_sales_returns_payments =
            await sales_returns_payments?.find({
              sales_return: selected_sales_return?._id,
            });

          const selected_sales_return_details = await sales_returns_details
            ?.find({
              sales_return: selected_sales_return?._id,
            })
            ?.populate({
              path: "description",
              match: { status: { $ne: 2 } },
            });

          let sales_return_details_and_units = [];

          for (value of selected_sales_return_details) {
            let details = value?.toObject();

            let selected_inventory_unit_details =
              await inventories_units_details?.find({
                inventory: value?.description?._id,
              });

            const selected_sales_return_details_units =
              await sales_returns_units_details?.find({
                details: value?._id,
              });
            // ?.sort({ created: 1 });

            sales_return_details_and_units?.push({
              ...details,
              unit_details_options: selected_sales_return_details_units,
              inventory_unit_details: selected_inventory_unit_details,
            });
          }

          const sales_returnData = selected_sales_return?.toObject();

          success_200(res, "", {
            ...sales_returnData,
            payments: selected_sales_returns_payments,
            details: sales_return_details_and_units,
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

const get_all_sales_returns = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (!authorize) {
      return unauthorized(res);
    }

    const {
      search,
      customer,
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

    const sales_returnsList = { branch: authorize?.branch, status: { $ne: 2 } };

    // Apply filters based on request body
    if (search) {
      sales_returnsList.$or = [{ number: { $regex: search, $options: "i" } }];
    }
    if (customer) sales_returnsList.customer = customer;
    if (contractor) sales_returnsList.contractor = contractor;
    if (status == 0) sales_returnsList.status = status;

    if (date?.start && date?.end) {
      let startDate = new Date(date.start);
      startDate.setHours(0, 0, 0, 0);

      let endDate = new Date(date.end);
      endDate.setHours(23, 59, 59, 999);

      sales_returnsList.date = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    if (due_date?.start && due_date?.end) {
      let startDate = new Date(due_date.start);
      startDate.setHours(0, 0, 0, 0);

      let endDate = new Date(due_date.end);
      endDate.setHours(23, 59, 59, 999);

      sales_returnsList.due_date = {
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
    const totalCount = await sales_returns.countDocuments(sales_returnsList);

    // Fetch paginated data
    const paginated_sales_returns = await sales_returns
      .find(sales_returnsList)
      .sort(sortOption)
      .skip((page_number - 1) * page_limit)
      .limit(page_limit)
      .populate("customer");

    const totalPages = Math.ceil(totalCount / page_limit);

    success_200(res, "", {
      currentPage: page_number,
      totalPages,
      totalCount,
      data: paginated_sales_returns,
    });
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_sales_returns_details = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { search, customer, contractor, status, date, due_date, sort } =
        req?.body;

      const sales_returnsList = { branch: authorize?.branch };
      sales_returnsList.status = { $ne: 2 };

      // Apply filters based on request body
      search &&
        (sales_returnsList.$or = [
          { number: { $regex: search, $options: "i" } },
        ]);
      customer && (sales_returnsList.customer = customer);
      contractor && (sales_returnsList.customer = contractor);
      status == 0 && (sales_returnsList.status = status);

      // Set sorting options
      let sortOption = { created: -1 };
      if (sort == 0) {
        sortOption = { total: 1 };
      } else if (sort == 1) {
        sortOption = { total: -1 };
      }

      if (date?.start && date?.end) {
        sales_returnsList.date = {
          $gte: new Date(date?.start),
          $lte: new Date(date?.end),
        };
      }

      // due_date
      if (due_date?.start && due_date?.end) {
        sales_returnsList.due_date = {
          $gte: new Date(due_date?.start),
          $lte: new Date(due_date?.end),
        };
      }

      const all_sales_returns = await sales_returns_details
        .find(sales_returnsList)
        .sort(sortOption);
      // ?.populate("customer");

      success_200(res, "", all_sales_returns);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_sales_return_log = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_sales_return_log = await sales_returns_log?.findById(id);

        if (!selected_sales_return_log) {
          failed_400(res, "sales_return not found");
        } else {
          success_200(res, "", selected_sales_return_log);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_sales_returns_log = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { sales_return } = req?.body;

      if (!sales_return) {
        incomplete_400(res);
      } else {
        const all_sales_returns_log = await sales_returns_log?.find({
          sales_return: sales_return,
        });
        success_200(res, "", all_sales_returns_log);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_sales_return_details = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_sales_return_detail = await sales_returns_details
          .find({ description: id, status: 1 })
          .populate({
            path: "sales_return",
            match: { status: 1 },
            populate: { path: "customer" },
          });

        selected_sales_return_detail.sort((a, b) => {
          const dateA = new Date(a.sales_return?.date);
          const dateB = new Date(b.sales_return?.date);
          return dateB - dateA;
        });

        success_200(res, "", selected_sales_return_detail);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_sales_return,
  update_sales_return,
  delete_sales_return,
  get_sales_return,
  get_all_sales_returns,
  get_all_sales_returns_details,
  get_all_sales_return_details,
  get_sales_return_log,
  get_all_sales_returns_log,
};
