const { authorization } = require("../Global/authorization");
const {
  failed_400,
  unauthorized,
  catch_400,
  incomplete_400,
  success_200,
} = require("../Global/errors");
const invoices = require("../Models/invoices");
const { checknull } = require("../Global/checknull");
const inventories = require("../Models/inventories");
const invoices_details = require("../Models/invoices_details");
const invoices_log = require("../Models/invoices_log");
const invoices_details_log = require("../Models/invoices_details_log");
const invoices_units_details = require("../Models/invoices_units_details");
const invoices_payments = require("../Models/invoices_payments");
const inventories_units_details = require("../Models/inventories_units_details");
const invoices_payments_log = require("../Models/invoices_payments_log");
const invoices_units_details_log = require("../Models/invoices_units_details_log");
const inventories_log = require("../Models/inventories_log");
const inventories_units_details_log = require("../Models/inventories_units_details_log");
const { default: mongoose } = require("mongoose");

const get_next_invoice = async (req, res, number) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const total_invoice = await invoices.countDocuments({
        branch: authorize?.branch,
      });

      const next_invoice_number = number + total_invoice;

      const existing_invoice_number = await invoices.findOne({
        number: next_invoice_number,
        branch: authorize?.branch,
      });

      if (existing_invoice_number) {
        return await get_next_invoice(req, res, next_invoice_number);
      } else {
        return next_invoice_number;
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

const create_invoice = async (req, res) => {
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

      let new_number = await get_next_invoice(req, res, 1000);
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
        const selected_invoice_number = await invoices?.findOne({
          number: assigned_number,
          branch: branch ? branch : authorize?.branch,
        });

        if (selected_invoice_number) {
          failed_400(res, "Invoice number exists");
        } else {
          //create invoice
          const invoice = new invoices({
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

          const invoice_save = await invoice?.save();

          //invoice details
          let invoice_details = [];
          let invoice_subtotal = 0;
          let invoice_taxamount = 0;
          let invoice_total = 0;
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
                let invoice_unit = value?.unit ? value?.unit : "";
                let invoice_unit_name = value?.unit_name
                  ? value?.unit_name
                  : "";
                let invoice_sale_price =
                  selected_inventory?._id == value?.unit
                    ? selected_inventory?.sale_price
                      ? selected_inventory?.sale_price
                      : 0
                    : selected_unit?.sale_price
                    ? selected_unit?.sale_price
                    : 0;
                let invoice_purchase_price =
                  selected_inventory?._id == value?.unit
                    ? selected_inventory?.purchase_price
                      ? selected_inventory?.purchase_price
                      : 0
                    : selected_unit?.purchase_price
                    ? selected_unit?.purchase_price
                    : 0;
                let invoice_price_per_unit =
                  selected_inventory?._id == value?.unit
                    ? selected_inventory?.price_per_unit
                      ? selected_inventory?.price_per_unit
                      : 0
                    : selected_unit?.price_per_unit
                    ? selected_unit?.price_per_unit
                    : 0;
                let invoice_conversion =
                  selected_inventory?._id == value?.unit
                    ? selected_inventory?.conversion
                      ? selected_inventory?.conversion
                      : 0
                    : selected_unit?.conversion
                    ? selected_unit?.conversion
                    : 0;
                let invoice_quantity = value?.quantity ? value?.quantity : 0;
                let invoice_delivered = value?.delivered ? value?.delivered : 0;
                let invoice_free = value?.free ? value?.free : 0;
                let invoice_tax = selected_inventory?.tax
                  ? selected_inventory?.tax
                  : 0;
                let invoice_barcode = selected_inventory?.barcode
                  ? selected_inventory?.barcode
                  : "";
                let invoice_expiry_date = selected_inventory?.expiry_date
                  ? selected_inventory?.expiry_date
                  : "";

                let price =
                  parseFloat(invoice_quantity) * parseFloat(invoice_sale_price);
                let tax_amount =
                  parseFloat(price) * (parseFloat(invoice_tax) / 100);
                let total = parseFloat(price) + parseFloat(tax_amount);

                let total_quantity =
                  parseFloat(invoice_quantity) + parseFloat(invoice_free);
                invoice_delivered =
                  parseFloat(invoice_delivered) <= parseFloat(total_quantity)
                    ? invoice_delivered
                    : total_quantity;

                //delivery status count
                if (
                  parseFloat(total_quantity) == parseFloat(invoice_delivered)
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

                //invoice details create
                const invoice_detail = new invoices_details({
                  invoice: invoice_save?._id,
                  description: selected_inventory?._id,
                  name: selected_inventory?.product?.name,
                  unit: invoice_unit,
                  unit_name: invoice_unit_name,
                  sale_price: invoice_sale_price,
                  purchase_price: invoice_purchase_price,
                  conversion: invoice_conversion,
                  quantity: invoice_quantity,
                  delivered: invoice_delivered,
                  free: invoice_free,
                  tax: invoice_tax,
                  barcode: invoice_barcode,
                  price_per_unit: invoice_price_per_unit,
                  expiry_date: invoice_expiry_date,
                  tax_amount: tax_amount,
                  total: total,
                  status: status ? status : 0,
                  ref: authorize?.ref,
                  branch: branch ? branch : authorize?.branch,
                  created: new Date(),
                  created_by: authorize?.id,
                });
                const invoice_detail_save = await invoice_detail?.save();

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

                      //invoice unit details
                      const invoice_unit_detail = new invoices_units_details({
                        details: invoice_detail_save?._id,
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

                      const invoice_unit_detail_save =
                        invoice_unit_detail?.save();
                    }
                  }
                }

                invoice_subtotal =
                  parseFloat(invoice_subtotal) + parseFloat(price);
                invoice_taxamount =
                  parseFloat(invoice_taxamount) + parseFloat(tax_amount);
                invoice_total = parseFloat(invoice_total) + parseFloat(total);

                count++;
              }
            }
          }

          if (count == details?.length) {
            const selected_invoice = await invoices?.findById(
              invoice_save?._id
            );

            if (selected_invoice) {
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
              let invoice_discount = 0;
              if (discount) {
                if (discount <= invoice_total) {
                  invoice_discount = discount;
                }
              }

              let invoice_delivery = delivery ? delivery : 0;

              let grand_total =
                parseFloat(invoice_total) +
                parseFloat(invoice_delivery) -
                parseFloat(invoice_discount);

              //payment status
              let invoice_payment_types = payment_types
                ? JSON?.parse(payment_types)
                : "";
              let invoice_payments = payments ? JSON?.parse(payments) : "";

              let invoice_paid = 0;
              let invoice_payment_details = [];
              if (invoice_payment_types?.length > 0) {
                for (value of invoice_payment_types) {
                  let invoice_payment_id = invoice_payments[value]?.id
                    ? invoice_payments[value]?.id
                    : "";
                  let invoice_payment_amount = invoice_payments[value]?.amount
                    ? parseFloat(invoice_payments[value]?.amount)
                    : 0;

                  invoice_paid =
                    parseFloat(invoice_paid) +
                    parseFloat(invoice_payment_amount);

                  invoice_payment_details?.push({
                    id: invoice_payment_id,
                    name: value,
                    amount: invoice_payment_amount,
                  });
                }
              }

              let data_payment_status = payment_status
                ? parseFloat(payment_status || 0)
                : 0;

              if (parseFloat(data_payment_status) == 2) {
                if (parseFloat(invoice_paid) == parseFloat(grand_total)) {
                  data_payment_status = 2;
                } else if (
                  parseFloat(invoice_paid) > 0 &&
                  parseFloat(invoice_paid) < parseFloat(grand_total)
                ) {
                  data_payment_status = 1;
                } else {
                  invoice_payment_details = [];
                  data_payment_status = 0;
                }
              }

              //order payment
              if (invoice_payment_details?.length > 0) {
                for (value of invoice_payment_details) {
                  const invoice_payment = await invoices_payments({
                    invoice: invoice_save?._id,
                    name: value?.name,
                    amount: value?.amount,
                    status: status ? status : 0,
                    ref: authorize?.ref,
                    branch: branch ? branch : authorize?.branch,
                    created: new Date(),
                    created_by: authorize?.id,
                  });

                  const invoice_payment_save = await invoice_payment?.save();
                }
              }

              selected_invoice.subtotal = invoice_subtotal
                ? invoice_subtotal
                : 0;
              selected_invoice.taxamount = invoice_taxamount
                ? invoice_taxamount
                : 0;
              selected_invoice.discount = invoice_discount
                ? invoice_discount
                : 0;
              selected_invoice.delivery = invoice_delivery
                ? invoice_delivery
                : 0;
              selected_invoice.delivery_status = data_delivery_status
                ? data_delivery_status
                : 0;
              selected_invoice.delivery_date = data_delivery_date;
              selected_invoice.payment_status = data_payment_status
                ? data_payment_status
                : 0;
              selected_invoice.total = grand_total ? grand_total : 0;

              const selected_invoice_save = await selected_invoice?.save();

              success_200(res, "Invoice created");
            } else {
              failed_400(res, "Invoice failed");
            }
          } else {
            failed_400(res, "Invoice failed");
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

const update_invoice = async (req, res) => {
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

      let new_number = await get_next_invoice(req, res, 1000);
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
        const selected_invoice = await invoices?.findById(id);

        if (!selected_invoice || selected_invoice?.status == 2) {
          failed_400(res, "Invoice Order not found");
        } else {
          const selected_invoice_number = await invoices?.findOne({
            _id: { $ne: id },
            number: assigned_number,
            branch: branch ? branch : authorize?.branch,
          });

          if (selected_invoice_number) {
            failed_400(res, "Invoice number exists");
          } else {
            //invoice details
            let invoice_details = [];
            let invoice_subtotal = 0;
            let invoice_taxamount = 0;
            let invoice_total = 0;
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
                  let invoice_unit = value?.unit ? value?.unit : "";
                  let invoice_unit_name = value?.unit_name
                    ? value?.unit_name
                    : "";
                  let invoice_sale_price =
                    selected_inventory?._id == value?.unit
                      ? selected_inventory?.sale_price
                        ? selected_inventory?.sale_price
                        : 0
                      : selected_unit?.sale_price
                      ? selected_unit?.sale_price
                      : 0;
                  let invoice_purchase_price =
                    selected_inventory?._id == value?.unit
                      ? selected_inventory?.purchase_price
                        ? selected_inventory?.purchase_price
                        : 0
                      : selected_unit?.purchase_price
                      ? selected_unit?.purchase_price
                      : 0;
                  let invoice_price_per_unit =
                    selected_inventory?._id == value?.unit
                      ? selected_inventory?.price_per_unit
                        ? selected_inventory?.price_per_unit
                        : 0
                      : selected_unit?.price_per_unit
                      ? selected_unit?.price_per_unit
                      : 0;
                  let invoice_conversion =
                    selected_inventory?._id == value?.unit
                      ? selected_inventory?.conversion
                        ? selected_inventory?.conversion
                        : 0
                      : selected_unit?.conversion
                      ? selected_unit?.conversion
                      : 0;
                  let invoice_quantity = value?.quantity ? value?.quantity : 0;
                  let invoice_delivered = value?.delivered
                    ? value?.delivered
                    : 0;
                  let invoice_free = value?.free ? value?.free : 0;
                  let invoice_tax = selected_inventory?.tax
                    ? selected_inventory?.tax
                    : 0;
                  let invoice_barcode = selected_inventory?.barcode
                    ? selected_inventory?.barcode
                    : "";
                  let invoice_expiry_date = selected_inventory?.expiry_date
                    ? selected_inventory?.expiry_date
                    : "";

                  let price =
                    parseFloat(invoice_quantity) *
                    parseFloat(invoice_sale_price);
                  let tax_amount =
                    parseFloat(price) * (parseFloat(invoice_tax) / 100);
                  let total = parseFloat(price) + parseFloat(tax_amount);

                  let total_quantity =
                    parseFloat(invoice_quantity) + parseFloat(invoice_free);
                  invoice_delivered =
                    parseFloat(invoice_delivered) <= parseFloat(total_quantity)
                      ? invoice_delivered
                      : total_quantity;

                  //delivery status count
                  if (
                    parseFloat(total_quantity) == parseFloat(invoice_delivered)
                  ) {
                    delivery_count++;
                  }

                  const selected_invoices_details =
                    await invoices_details?.findOne({
                      description: selected_inventory?._id,
                    });

                  //inventories create (stock calculation)
                  let inventory_stock = 0;
                  if (selected_inventory?._id == value?.unit) {
                    //if main unit
                    let stock = parseFloat(selected_inventory?.stock || 0);

                    let previous_stock = selected_invoices_details?.delivered;

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
                      parseFloat(total_unit_stock || 0) <=
                      parseFloat(stock || 0)
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

                  if (selected_invoices_details) {
                    //update invoice details
                    selected_invoices_details.name =
                      selected_inventory?.product?.name;
                    selected_invoices_details.unit = invoice_unit;
                    selected_invoices_details.unit_name = invoice_unit_name;
                    selected_invoices_details.sale_price = invoice_sale_price;
                    selected_invoices_details.purchase_price =
                      invoice_purchase_price;
                    selected_invoices_details.conversion = invoice_conversion;
                    selected_invoices_details.quantity = invoice_quantity;
                    selected_invoices_details.delivered = invoice_delivered;
                    selected_invoices_details.free = invoice_free;
                    selected_invoices_details.tax = invoice_tax;
                    selected_invoices_details.barcode = invoice_barcode;
                    selected_invoices_details.price_per_unit =
                      invoice_price_per_unit;
                    selected_invoices_details.expiry_date = invoice_expiry_date;
                    selected_invoices_details.tax_amount = tax_amount;
                    selected_invoices_details.total = total;
                    selected_invoices_details.status = status ? status : 0;

                    const selected_invoices_details_save =
                      await selected_invoices_details?.save();

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

                          const selected_invoices_units_details =
                            await invoices_units_details?.findOne({
                              inventory_unit:
                                selected_inventory_unit_detail?._id,
                            });

                          //invoice unit details
                          selected_invoices_units_details.name = v?.name;
                          selected_invoices_units_details.quantity =
                            parseFloat(value?.quantity || 0) *
                            parseFloat(v?.conversion || 0);
                          selected_invoices_units_details.purchase_price =
                            v?.price_per_unit;
                          selected_invoices_units_details.price_per_unit =
                            v?.price_per_unit;
                          selected_invoices_units_details.sale_price =
                            v?.sale_price;
                          selected_invoices_units_details.conversion =
                            v?.conversion;
                          selected_invoices_units_details.unit_quantity =
                            parseFloat(value?.quantity || 0) *
                            parseFloat(v?.conversion || 0);
                          selected_invoices_units_details.unit_delivered =
                            total_unit_stock;
                          selected_invoices_units_details.status = status
                            ? status
                            : 0;

                          const selected_invoices_units_details_save =
                            selected_invoices_units_details?.save();
                        }
                      }
                    }
                  } else {
                    //create invoice details
                    const invoice_detail = new invoices_details({
                      invoice: selected_invoice?._id,
                      description: selected_inventory?._id,
                      name: selected_inventory?.product?.name,
                      unit: invoice_unit,
                      unit_name: invoice_unit_name,
                      sale_price: invoice_sale_price,
                      purchase_price: invoice_purchase_price,
                      conversion: invoice_conversion,
                      quantity: invoice_quantity,
                      delivered: invoice_delivered,
                      free: invoice_free,
                      tax: invoice_tax,
                      barcode: invoice_barcode,
                      price_per_unit: invoice_price_per_unit,
                      expiry_date: invoice_expiry_date,
                      tax_amount: tax_amount,
                      total: total,
                      status: status ? status : 0,
                      ref: authorize?.ref,
                      branch: branch ? branch : authorize?.branch,
                      created: new Date(),
                      created_by: authorize?.id,
                    });
                    const invoice_detail_save = await invoice_detail?.save();

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

                          //invoice unit details
                          const invoice_unit_detail =
                            new invoices_units_details({
                              details: invoice_detail_save?._id,
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

                          const invoice_unit_detail_save =
                            invoice_unit_detail?.save();
                        }
                      }
                    }
                  }

                  invoice_subtotal =
                    parseFloat(invoice_subtotal) + parseFloat(price);
                  invoice_taxamount =
                    parseFloat(invoice_taxamount) + parseFloat(tax_amount);
                  invoice_total = parseFloat(invoice_total) + parseFloat(total);

                  count++;
                }
              }
            }

            if (count == details?.length) {
              // const selected_invoice = await invoices?.findById(
              //   invoice_save?._id
              // );

              if (selected_invoice) {
                //delivery status
                let data_delivery_status = delivery_status
                  ? parseFloat(delivery_status || 0)
                  : 0;
                let data_delivery_date = delivery_date ? delivery_date : "";

                if (parseFloat(data_delivery_status) == 2) {
                  if (parseFloat(delivery_count) == invoice_details?.length) {
                    data_delivery_status = 2;
                  } else if (
                    parseFloat(delivery_count) > 0 &&
                    parseFloat(delivery_count) < invoice_details?.length
                  ) {
                    data_delivery_status = 1;
                    data_delivery_date = "";
                  } else {
                    data_delivery_status = 0;
                    data_delivery_date = "";
                  }
                }

                //grand total
                let invoice_discount = 0;
                if (discount) {
                  if (discount <= invoice_total) {
                    invoice_discount = discount;
                  }
                }

                let invoice_delivery = delivery ? delivery : 0;

                let grand_total =
                  parseFloat(invoice_total) +
                  parseFloat(invoice_delivery) -
                  parseFloat(invoice_discount);

                //payment status
                let invoice_payment_types = payment_types
                  ? JSON?.parse(payment_types)
                  : "";
                let invoice_payments = payments ? JSON?.parse(payments) : "";

                let invoice_paid = 0;
                let invoice_payment_details = [];
                if (invoice_payment_types?.length > 0) {
                  for (value of invoice_payment_types) {
                    let invoice_payment_id = invoice_payments[value]?.id
                      ? invoice_payments[value]?.id
                      : "";
                    let invoice_payment_amount = invoice_payments[value]?.amount
                      ? parseFloat(invoice_payments[value]?.amount)
                      : 0;

                    invoice_paid =
                      parseFloat(invoice_paid) +
                      parseFloat(invoice_payment_amount);

                    invoice_payment_details?.push({
                      id: invoice_payment_id,
                      name: value,
                      amount: invoice_payment_amount,
                    });
                  }
                }

                let data_payment_status = payment_status
                  ? parseFloat(payment_status || 0)
                  : 0;
                if (parseFloat(data_payment_status) == 2) {
                  if (parseFloat(invoice_paid) == parseFloat(grand_total)) {
                    data_payment_status = 2;
                  } else if (
                    parseFloat(invoice_paid) > 0 &&
                    parseFloat(invoice_paid) < parseFloat(grand_total)
                  ) {
                    data_payment_status = 1;
                  } else {
                    invoice_payment_details = [];
                    data_payment_status = 0;
                  }
                }

                const delete_invoice_payment_details =
                  await invoices_payments?.deleteMany({
                    invoice: selected_invoice?._id,
                  });

                //order payment
                if (invoice_payment_details?.length > 0) {
                  for (value of invoice_payment_details) {
                    const invoice_payment = await invoices_payments({
                      invoice: selected_invoice?._id,
                      name: value?.name,
                      amount: value?.amount,
                      status: status ? status : 0,
                      ref: authorize?.ref,
                      branch: branch ? branch : authorize?.branch,
                      created: new Date(),
                      created_by: authorize?.id,
                    });

                    const invoice_payment_save = await invoice_payment?.save();
                  }
                }

                selected_invoice.subtotal = invoice_subtotal
                  ? invoice_subtotal
                  : 0;
                selected_invoice.taxamount = invoice_taxamount
                  ? invoice_taxamount
                  : 0;
                selected_invoice.discount = invoice_discount
                  ? invoice_discount
                  : 0;
                selected_invoice.delivery = invoice_delivery
                  ? invoice_delivery
                  : 0;
                selected_invoice.delivery_status = data_delivery_status
                  ? data_delivery_status
                  : 0;
                selected_invoice.delivery_date = data_delivery_date;
                selected_invoice.payment_status = data_payment_status
                  ? data_payment_status
                  : 0;
                selected_invoice.total = grand_total ? grand_total : 0;

                const selected_invoice_save = await selected_invoice?.save();

                success_200(res, "Invoice created");
              } else {
                failed_400(res, "Invoice failed");
              }
            } else {
              failed_400(res, "Invoice failed");
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

const delete_invoice = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_invoice = await invoices?.findById(id);

        if (!selected_invoice || selected_invoice?.status == 2) {
          failed_400(res, "invoice Order not found");
        } else {
          // const invoice_log = new invoices_log({
          //   invoice: id,
          //   customer: selected_invoice?.customer,
          //   number: selected_invoice?.number,
          //   date: selected_invoice?.date,
          //   due_date: selected_invoice?.due_date,
          //   subtotal: selected_invoice?.subtotal,
          //   taxamount: selected_invoice?.taxamount,
          //   discount: selected_invoice?.discount,
          //   delivery: selected_invoice?.delivery,
          //   delivery_status: selected_invoice?.delivery_status,
          //   delivery_date: selected_invoice?.delivery_date,
          //   payment_status: selected_invoice?.payment_status,
          //   payment_types: selected_invoice?.payment_types,
          //   payments: selected_invoice?.payments,
          //   paid: selected_invoice?.paid,
          //   remaining: selected_invoice?.remaining,
          //   total: selected_invoice?.total,
          //   status: selected_invoice?.status,
          //   ref: selected_invoice?.ref,
          //   branch: selected_invoice?.branch,
          //   updated: new Date(),
          //   updated_by: authorize?.id,
          // });
          // const invoice_log_save = await invoice_log?.save();

          selected_invoice.status = 2;
          const delete_invoice = await selected_invoice?.save();

          success_200(res, "invoice Order deleted");
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_invoice = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_invoice = await invoices
          ?.findById(id)
          ?.populate("customer")
          ?.populate("branch");

        if (!selected_invoice || selected_invoice?.status == 2) {
          failed_400(res, "invoice Order not found");
        } else {
          const selected_invoices_payments = await invoices_payments?.find({
            invoice: selected_invoice?._id,
          });

          const selected_invoice_details = await invoices_details
            ?.find({
              invoice: selected_invoice?._id,
            })
            ?.populate({
              path: "description",
              match: { status: { $ne: 2 } },
            });

          let invoice_details_and_units = [];

          for (value of selected_invoice_details) {
            let details = value?.toObject();

            let selected_inventory_unit_details =
              await inventories_units_details?.find({
                inventory: value?.description?._id,
              });

            const selected_invoice_details_units =
              await invoices_units_details?.find({
                details: value?._id,
              });
            // ?.sort({ created: 1 });

            invoice_details_and_units?.push({
              ...details,
              unit_details_options: selected_invoice_details_units,
              inventory_unit_details: selected_inventory_unit_details,
            });
          }

          const invoiceData = selected_invoice?.toObject();

          success_200(res, "", {
            ...invoiceData,
            payments: selected_invoices_payments,
            details: invoice_details_and_units,
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

const get_all_invoices = async (req, res) => {
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

    const invoicesList = { branch: authorize?.branch, status: { $ne: 2 } };

    // Apply filters based on request body
    if (search) {
      invoicesList.$or = [{ number: { $regex: search, $options: "i" } }];
    }
    if (customer) invoicesList.customer = customer;
    if (contractor) invoicesList.contractor = contractor;
    if (status == 0) invoicesList.status = status;

    if (date?.start && date?.end) {
      invoicesList.date = {
        $gte: new Date(date?.start),
        $lte: new Date(date?.end),
      };
    }

    if (due_date?.start && due_date?.end) {
      invoicesList.due_date = {
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
    const totalCount = await invoices.countDocuments(invoicesList);

    // Fetch paginated data
    const paginated_invoices = await invoices
      .find(invoicesList)
      .sort(sortOption)
      .skip((page_number - 1) * page_limit)
      .limit(page_limit)
      .populate("customer");

    const totalPages = Math.ceil(totalCount / page_limit);

    success_200(res, "", {
      currentPage: page_number,
      totalPages,
      totalCount,
      data: paginated_invoices,
    });
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_invoices_details = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { search, customer, contractor, status, date, due_date, sort } =
        req?.body;

      const invoicesList = { branch: authorize?.branch };
      invoicesList.status = { $ne: 2 };

      // Apply filters based on request body
      search &&
        (invoicesList.$or = [{ number: { $regex: search, $options: "i" } }]);
      customer && (invoicesList.customer = customer);
      contractor && (invoicesList.customer = contractor);
      status == 0 && (invoicesList.status = status);

      // Set sorting options
      let sortOption = { created: -1 };
      if (sort == 0) {
        sortOption = { total: 1 };
      } else if (sort == 1) {
        sortOption = { total: -1 };
      }

      if (date?.start && date?.end) {
        invoicesList.date = {
          $gte: new Date(date?.start),
          $lte: new Date(date?.end),
        };
      }

      // due_date
      if (due_date?.start && due_date?.end) {
        invoicesList.due_date = {
          $gte: new Date(due_date?.start),
          $lte: new Date(due_date?.end),
        };
      }

      const all_invoices = await invoices_details
        .find(invoicesList)
        .sort(sortOption);
      // ?.populate("customer");

      success_200(res, "", all_invoices);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_invoice_log = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_invoice_log = await invoices_log?.findById(id);

        if (!selected_invoice_log) {
          failed_400(res, "invoice not found");
        } else {
          success_200(res, "", selected_invoice_log);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_invoices_log = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { invoice } = req?.body;

      if (!invoice) {
        incomplete_400(res);
      } else {
        const all_invoices_log = await invoices_log?.find({
          invoice: invoice,
        });
        success_200(res, "", all_invoices_log);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_invoice_details = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_invoice_detail = await invoices_details
          .find({ description: id, status: 1 })
          .populate({
            path: "invoice",
            match: { status: 1 },
            populate: { path: "customer" },
          });

        selected_invoice_detail.sort((a, b) => {
          const dateA = new Date(a.invoice?.date);
          const dateB = new Date(b.invoice?.date);
          return dateB - dateA;
        });

        success_200(res, "", selected_invoice_detail);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_invoice,
  update_invoice,
  delete_invoice,
  get_invoice,
  get_all_invoices,
  get_all_invoices_details,
  get_all_invoice_details,
  get_invoice_log,
  get_all_invoices_log,
};
