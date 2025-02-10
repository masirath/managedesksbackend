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
const suppliers = require("../Models/suppliers");
const invoices_log = require("../Models/invoices_log");
const invoices_details_log = require("../Models/invoices_details_log");

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
        subtotal,
        taxamount,
        discount,
        delivery,
        delivery_status,
        delivery_date,
        payment_status,
        payment_types,
        payments,
        paid,
        remaining,
        total,
        status,
        branch,
      } = req?.body;

      let new_number = await get_next_invoice(req, res, 1000);
      let assigned_number = number ? number : new_number;

      if (
        // !customer ||
        !assigned_number ||
        !date ||
        // !due_date ||
        !details?.length > 0
      ) {
        incomplete_400(res);
      } else {
        const selected_invoice_number = await invoices?.findOne({
          number: assigned_number,
          branch: authorize?.branch,
        });

        if (selected_invoice_number) {
          failed_400(res, "Invoice number exists");
        } else {
          //invoice order total
          let invoice_details = [];
          let invoice_subtotal = 0;
          let invoice_taxamount = 0;
          let invoice_total = 0;

          for (value of details) {
            const selected_inventory = await inventories
              ?.findById?.(value?.description)
              ?.populate({
                path: "product",
                populate: { path: "unit" },
              });

            if (selected_inventory) {
              let invoice_quantity = value?.quantity ? value?.quantity : 0;
              let invoice_delivered = value?.delivered ? value?.delivered : 0;
              if (
                parseFloat(invoice_quantity) <= parseFloat(invoice_delivered)
              ) {
                invoice_delivered = invoice_delivered;
              } else {
                invoice_delivered = invoice_quantity;
              }
              let sale_price = value?.sale_price ? value?.sale_price : 0;
              // let purchase_price = value?.purchase_price
              //   ? value?.purchase_price
              //   : 0;
              let invoice_tax = value?.tax ? value?.tax : 0;

              let price = parseFloat(invoice_quantity) * parseFloat(sale_price);
              let tax_amount =
                parseFloat(price) * (parseFloat(invoice_tax) / 100);
              let total = parseFloat(price) + parseFloat(tax_amount);

              invoice_details?.push({
                description: selected_inventory?._id,
                name: selected_inventory?.name,
                unit: selected_inventory?.product?.unit?.name,
                sale_price: sale_price,
                quantity: invoice_quantity,
                delivered: invoice_delivered,
                tax: invoice_tax,
                tax_amount: tax_amount,
                total: total,
                status: status ? status : 0,
                ref: authorize?.ref,
                branch: branch ? branch : authorize?.branch,
                created: new Date(),
                created_by: authorize?.id,
              });

              invoice_subtotal =
                parseFloat(invoice_subtotal) + parseFloat(price);
              invoice_taxamount =
                parseFloat(invoice_taxamount) + parseFloat(tax_amount);
              invoice_total = parseFloat(invoice_total) + parseFloat(total);
            }
          }

          if (details?.length === invoice_details?.length) {
            //invoice order save
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

            //invoice payment calculation
            let invoice_payment_types = payment_types
              ? JSON?.parse(payment_types)
              : "";
            let invoice_payments = payments ? JSON?.parse(payments) : "";
            let invoice_paid = 0;
            let invoice_remaining = 0;

            if (invoice_payment_types?.length > 0) {
              for (value of invoice_payment_types) {
                let invoice_payment_amount = invoice_payments[value]
                  ? parseFloat(invoice_payments[value])
                  : 0;

                invoice_paid =
                  parseFloat(invoice_paid) + parseFloat(invoice_payment_amount);
              }
            }

            if (parseFloat(invoice_paid) <= parseFloat(grand_total)) {
              invoice_remaining =
                parseFloat(grand_total) - parseFloat(invoice_paid);
            }

            const invoice = new invoices({
              customer: customer,
              number: assigned_number,
              date: date,
              due_date: due_date,
              subtotal: invoice_subtotal ? invoice_subtotal : 0,
              taxamount: invoice_taxamount ? invoice_taxamount : 0,
              discount: invoice_discount ? invoice_discount : 0,
              delivery: invoice_delivery ? invoice_delivery : 0,
              delivery_status: delivery_status ? delivery_status : 0,
              delivery_date: delivery_date,
              payment_status: payment_status ? payment_status : 0,
              payment_types: payment_types,
              payments: payments,
              paid: invoice_paid ? invoice_paid : 0,
              remaining: invoice_remaining ? invoice_remaining : 0,
              total: grand_total ? grand_total : 0,
              status: status ? status : 0,
              ref: authorize?.ref,
              branch: branch ? branch : authorize?.branch,
              created: new Date(),
              created_by: authorize?.id,
            });

            const invoice_save = await invoice?.save();

            for (value of invoice_details) {
              //invoice order details save
              const selected_inventory = await inventories
                ?.findById?.(value?.description)
                ?.populate("product");

              if (selected_inventory) {
                //invoice order details inventory stock save
                let selected_inventory_stock =
                  parseFloat(value?.delivered) <=
                  parseFloat(selected_inventory?.stock)
                    ? parseFloat(selected_inventory?.stock) -
                      parseFloat(value?.delivered)
                    : 0;

                if (selected_inventory?.product?.type == 1) {
                  selected_inventory.stock = selected_inventory_stock;
                  const inventory_save = await selected_inventory?.save();
                }

                const invoice_detail = new invoices_details({
                  invoice: invoice_save?._id,
                  description: value?.description,
                  name: selected_inventory?.product?.name,
                  unit: value?.unit,
                  sale_price: value?.sale_price,
                  quantity: value?.quantity,
                  // delivered: value?.delivered,
                  delivered: selected_inventory_stock,
                  tax: value?.tax,
                  tax_amount: value?.tax_amount,
                  total: value?.total,
                  status: status ? status : 0,
                  ref: authorize?.ref,
                  branch: branch ? branch : authorize?.branch,
                  created: new Date(),
                  created_by: authorize?.id,
                });

                const invoice_detail_save = await invoice_detail?.save();
              }
            }
            success_200(res, "Invoice Order created");
          } else {
            failed_400(res, "Invoice order failed");
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
        subtotal,
        taxamount,
        discount,
        delivery,
        delivery_status,
        delivery_date,
        payment_status,
        payment_types,
        payments,
        paid,
        remaining,
        total,
        status,
        branch,
      } = req?.body;

      let new_number = await get_next_invoice(req, res, 1000);
      let assigned_number = number ? number : new_number;

      if (
        !id ||
        !customer ||
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
          const selected_purchase_order_number = await purchase_orders.findOne({
            _id: { $ne: id },
            number: assigned_number,
            status: 1,
            branch: branch ? branch : authorize?.branch,
          });

          if (selected_purchase_order_number) {
            failed_400(res, "Purchase number exists");
          } else {
            success_200("Invoice updated");
            //   // invoice order total calculation
            //   let invoice_details = [];
            //   let invoice_subtotal = 0;
            //   let invoice_taxamount = 0;
            //   let invoice_total = 0;

            //   for (value of details) {
            //     const selected_inventory = await inventories?.findById?.(
            //       value?.description
            //     );
            //     // ?.populate({
            //     //   path: "unit",
            //     //   match: { status: { $ne: 2 } },
            //     // });

            //     if (selected_inventory) {
            //       let invoice_quantity = value?.quantity ? value?.quantity : 0;
            //       let invoice_delivered = value?.delivered ? value?.delivered : 0;
            //       if (
            //         parseFloat(invoice_quantity) <= parseFloat(invoice_delivered)
            //       ) {
            //         invoice_delivered = invoice_delivered;
            //       } else {
            //         invoice_delivered = invoice_quantity;
            //       }
            //       let sale_price = value?.sale_price ? value?.sale_price : 0;
            //       let invoice_tax = value?.tax ? value?.tax : 0;

            //       let price = parseFloat(invoice_quantity) * parseFloat(sale_price);
            //       let tax_amount =
            //         parseFloat(price) * (parseFloat(invoice_tax) / 100);
            //       let total = parseFloat(price) + parseFloat(tax_amount);

            //       invoice_details?.push({
            //         id: value?.id,
            //         description: selected_inventory?._id,
            //         name: selected_inventory?.name,
            //         unit: selected_inventory?.unit?.name,
            //         sale_price: sale_price,
            //         quantity: invoice_quantity,
            //         delivered: invoice_delivered,
            //         tax: invoice_tax,
            //         total: total,
            //         status: status ? status : 0,
            //         ref: authorize?.ref,
            //         branch: branch ? branch : authorize?.branch,
            //         created: new Date(),
            //         created_by: authorize?.id,
            //       });

            //       invoice_subtotal =
            //         parseFloat(invoice_subtotal) + parseFloat(price);
            //       invoice_taxamount =
            //         parseFloat(invoice_taxamount) + parseFloat(tax_amount);
            //       invoice_total = parseFloat(invoice_total) + parseFloat(total);
            //     }
            //   }

            //   if (details?.length === invoice_details?.length) {
            //     // invoice order log save
            //     const invoice_log = new invoices_log({
            //       invoice: id,
            //       customer: selected_invoice?.customer,
            //       number: selected_invoice?.number,
            //       date: selected_invoice?.date,
            //       due_date: selected_invoice?.due_date,
            //       subtotal: selected_invoice?.subtotal,
            //       taxamount: selected_invoice?.taxamount,
            //       discount: selected_invoice?.discount,
            //       delivery: selected_invoice?.delivery,
            //       delivery_status: selected_invoice?.delivery_status,
            //       delivery_date: selected_invoice?.delivery_date,
            //       payment_status: selected_invoice?.payment_status,
            //       payment_types: selected_invoice?.payment_types,
            //       payments: selected_invoice?.payments,
            //       paid: selected_invoice?.paid,
            //       remaining: selected_invoice?.remaining,
            //       total: selected_invoice?.total,
            //       status: selected_invoice?.status,
            //       ref: selected_invoice?.ref,
            //       branch: selected_invoice?.branch,
            //       updated: new Date(),
            //       updated_by: authorize?.id,
            //     });

            //     const invoice_log_save = await invoice_log?.save();

            //     // invoice order update
            //     let invoice_discount = 0;
            //     if (discount) {
            //       if (discount <= invoice_total) {
            //         invoice_discount = discount;
            //       }
            //     }
            //     let invoice_delivery = delivery ? delivery : 0;

            //     let grand_total =
            //       parseFloat(invoice_total) +
            //       parseFloat(invoice_delivery) -
            //       parseFloat(invoice_discount);

            //     //invoice payment calculation
            //     let invoice_payment_types = payment_types
            //       ? JSON?.parse(payment_types)
            //       : "";
            //     let invoice_payments = payments ? JSON?.parse(payments) : "";
            //     let invoice_paid = 0;
            //     let invoice_remaining = 0;

            //     if (invoice_payment_types?.length > 0) {
            //       for (value of invoice_payment_types) {
            //         let invoice_payment_amount = invoice_payments[value]
            //           ? parseFloat(invoice_payments[value])
            //           : 0;

            //         invoice_paid =
            //           parseFloat(invoice_paid) + parseFloat(invoice_payment_amount);
            //       }
            //     }

            //     if (parseFloat(invoice_paid) <= parseFloat(grand_total)) {
            //       invoice_remaining =
            //         parseFloat(grand_total) - parseFloat(invoice_paid);
            //     }

            //     selected_invoice.customer = customer;
            //     selected_invoice.number = assigned_number;
            //     selected_invoice.date = date;
            //     selected_invoice.due_date = due_date;
            //     selected_invoice.subtotal = invoice_subtotal ? invoice_subtotal : 0;
            //     selected_invoice.taxamount = invoice_taxamount
            //       ? invoice_taxamount
            //       : 0;
            //     selected_invoice.discount = invoice_discount ? invoice_discount : 0;
            //     selected_invoice.delivery = invoice_delivery ? invoice_delivery : 0;
            //     selected_invoice.delivery_status = delivery_status
            //       ? delivery_status
            //       : 0;
            //     selected_invoice.delivery_date = delivery_date;
            //     selected_invoice.payment_status = payment_status
            //       ? payment_status
            //       : 0;
            //     selected_invoice.payment_types = payment_types;
            //     selected_invoice.payments = payments;
            //     selected_invoice.paid = invoice_paid ? invoice_paid : 0;
            //     selected_invoice.remaining = invoice_remaining
            //       ? invoice_remaining
            //       : 0;
            //     selected_invoice.total = grand_total ? grand_total : 0;
            //     selected_invoice.status = status ? status : 0;

            //     const invoice_save = await selected_invoice?.save();

            //     // invoice order details
            //     for (value of invoice_details) {
            //       const selected_inventory = await inventories?.findById?.(
            //         value?.description
            //       );

            //       if (selected_inventory) {
            //         if (value?.id) {
            //           // invoice order details update
            //           const selected_invoice_details =
            //             await invoices_details?.findById?.(value?.id);

            //           if (selected_invoice_details) {
            //             // invoice order details log save
            //             const invoice_detail_log = new invoices_details_log({
            //               detail: selected_invoice_details?._id,
            //               invoice: selected_invoice_details?.invoice,
            //               description: selected_invoice_details?.description,
            //               name: selected_invoice_details?.name,
            //               unit: selected_invoice_details?.unit,
            //               sale_price: selected_invoice_details?.sale_price,
            //               quantity: selected_invoice_details?.quantity,
            //               delivered: selected_invoice_details?.delivered,
            //               tax: selected_invoice_details?.tax,
            //               total: selected_invoice_details?.total,
            //               status: selected_invoice_details?.status,
            //               ref: selected_invoice_details?.ref,
            //               branch: selected_invoice_details?.branch,
            //               updated: new Date(),
            //               updated_by: authorize?.id,
            //             });

            //             const invoice_detail_log_save =
            //               await invoice_detail_log?.save();

            //             // invoice order details update
            //             selected_invoice_details.invoice = invoice_save?._id;
            //             selected_invoice_details.description = value?.description;
            //             selected_invoice_details.name = value?.name;
            //             selected_invoice_details.unit = value?.unit;
            //             selected_invoice_details.sale_price = value?.sale_price;
            //             selected_invoice_details.quantity = value?.quantity;
            //             selected_invoice_details.delivered = value?.delivered;
            //             selected_invoice_details.tax = value?.tax;
            //             selected_invoice_details.total = value?.total;
            //             selected_invoice_details.status = status ? status : 0;

            //             const invoice_detail_update =
            //               await selected_invoice_details?.save();

            //             // invoice order details inventory stock update
            //             if (selected_inventory?.type == 1) {
            //               let invoice_stock =
            //                 parseFloat(selected_inventory?.stock) -
            //                 selected_invoice_details?.delivered;

            //               selected_inventory.stock =
            //                 parseFloat(invoice_stock) +
            //                 parseFloat(value?.delivered);

            //               const inventory_save = await selected_inventory?.save();
            //             }
            //           }
            //         } else {
            //           // invoice order details save
            //           const invoice_detail = new invoices_details({
            //             invoice: invoice_save?._id,
            //             description: value?.description,
            //             name: value?.name,
            //             unit: value?.unit,
            //             sale_price: value?.sale_price,
            //             quantity: value?.quantity,
            //             delivered: value?.delivered,
            //             tax: value?.tax,
            //             total: value?.total,
            //             status: status ? status : 0,
            //             ref: authorize?.ref,
            //             branch: branch ? branch : authorize?.branch,
            //             created: new Date(),
            //             created_by: authorize?.id,
            //           });

            //           const invoice_detail_save = await invoice_detail?.save();

            //           // invoice order details inventory stock save
            //           if (selected_inventory?.type == 1) {
            //             selected_inventory.stock =
            //               parseFloat(selected_inventory?.stock) +
            //               parseFloat(value?.delivered);

            //             const inventory_save = await selected_inventory?.save();
            //           }
            //         }
            //       }
            //     }
            //     success_200(res, "Invoice Order updated");
            //   } else {
            //     failed_400(res, "Invoice update failed");
            //   }
            // }
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
          failed_400(res, "Invoice Order not found");
        } else {
          const invoice_log = new invoices_log({
            invoice: id,
            customer: selected_invoice?.customer,
            number: selected_invoice?.number,
            date: selected_invoice?.date,
            due_date: selected_invoice?.due_date,
            subtotal: selected_invoice?.subtotal,
            taxamount: selected_invoice?.taxamount,
            discount: selected_invoice?.discount,
            delivery: selected_invoice?.delivery,
            delivery_status: selected_invoice?.delivery_status,
            delivery_date: selected_invoice?.delivery_date,
            payment_status: selected_invoice?.payment_status,
            payment_types: selected_invoice?.payment_types,
            payments: selected_invoice?.payments,
            paid: selected_invoice?.paid,
            remaining: selected_invoice?.remaining,
            total: selected_invoice?.total,
            status: selected_invoice?.status,
            ref: selected_invoice?.ref,
            branch: selected_invoice?.branch,
            updated: new Date(),
            updated_by: authorize?.id,
          });
          const invoice_log_save = await invoice_log?.save();

          selected_invoice.status = 2;
          const delete_invoice = await selected_invoice?.save();

          success_200(res, "Invoice Order deleted");
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
          ?.populate({ path: "customer", match: { status: 1 } })
          ?.populate("branch");

        if (!selected_invoice || selected_invoice?.status == 2) {
          failed_400(res, "Invoice Order not found");
        } else {
          const selected_invoice_details = await invoices_details
            ?.find({
              invoice: selected_invoice?._id,
            })
            ?.populate({
              path: "description",
              match: { status: { $ne: 2 } },
              populate: {
                path: "product",
              },
            });

          const invoiceData = selected_invoice?.toObject();

          success_200(res, "", {
            ...invoiceData,
            details: selected_invoice_details,
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

    if (authorize) {
      const { search, supplier, contractor, status, date, due_date, sort } =
        req?.body;

      const invoicesList = { branch: authorize?.branch };
      invoicesList.status = { $ne: 2 };

      // Apply filters based on request body
      search &&
        (invoicesList.$or = [{ number: { $regex: search, $options: "i" } }]);
      supplier && (invoicesList.customer = supplier);
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

      const all_invoices = await invoices
        .find(invoicesList)
        .sort(sortOption)
        ?.populate("created_by")
        ?.populate?.("customer");

      success_200(res, "", all_invoices);
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
          ?.find({ description: id, status: 1 })
          ?.sort({ sale_price: -1 })
          ?.populate("invoice");

        let invoiceDetailsData = [];

        for (value of selected_invoice_detail) {
          const invoiceDetailData = value?.toObject();

          const selected_invoice = await invoices?.findById(value?.invoice?.id);

          const selected_supplier = await suppliers?.findById(
            selected_invoice?.customer
          );

          const selected_contractor = await contractors?.findById(
            selected_invoice?.customer
          );

          if (selected_supplier) {
            invoiceDetailsData?.push({
              ...invoiceDetailData,
              invoice: {
                ...invoiceDetailData?.invoice,
                customer: selected_supplier,
              },
            });
          } else if (selected_contractor) {
            invoiceDetailsData?.push({
              ...invoiceDetailData,
              invoice: {
                ...invoiceDetailData?.invoice,
                customer: selected_contractor,
              },
            });
          }
        }

        success_200(res, "", invoiceDetailsData);
      }
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
          failed_400(res, "Invoice not found");
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

module.exports = {
  create_invoice,
  update_invoice,
  delete_invoice,
  get_invoice,
  get_all_invoices,
  get_all_invoice_details,
  get_invoice_log,
  get_all_invoices_log,
};
