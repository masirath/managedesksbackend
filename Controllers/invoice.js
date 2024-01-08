const invoice = require("../Models/invoice");
const invoice_details = require("../Models/invoice_details");
const invoice_payment = require("../Models/invoice_payment");
const customers = require("../Models/customers");
const items = require("../Models/items");
const {
  catch_400,
  incomplete_400,
  error_400,
  unauthorized,
  success_200,
  failed_400,
} = require("../Global/errors");
const { authorization } = require("../Global/authorization");

const get_next_invoice = async (req, res, number) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const total_invoice = await invoice.countDocuments({
        branch: authorize?.branch,
      });

      const next_invoice_number = number + total_invoice;

      const existing_invoice_number = await invoice.findOne({
        invoice_number: next_invoice_number,
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
    catch_400(res);
  }
};

const get_create_invoice = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const get_customers = await customers.find({ branch: authorize?.branch });
      const get_items = await items.find({ branch: authorize?.branch });
      const invoice_number = await get_next_invoice(req, res, 1000);

      const data = {
        invoice_number: invoice_number,
        customers: get_customers,
        items: get_items,
      };

      success_200(res, "", data);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res);
  }
};

const create_invoice = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const {
        invoice_number,
        customer,
        date_from,
        date_to,
        invoice_status,
        payment_status,
        status,
        branch,
        details,
      } = req?.body;
      if (
        !invoice_number ||
        !customer ||
        !date_from ||
        !date_to ||
        !invoice_status ||
        details?.length <= 0
      ) {
        incomplete_400(res);
      } else {
        const existing_invoice = await invoice?.findOne({
          invoice_number: invoice_number,
          branch: authorize?.branch,
        });

        if (existing_invoice) {
          error_400(res, 401, "Invoice number exists");
        } else {
          let total_amount = 0;
          let tax_amount = 0;

          for (const value of details) {
            const item = await items.findById(value?.id);

            if (item) {
              total_amount +=
                parseFloat(value?.quantity) * parseFloat(item?.sale_price);
              tax_amount +=
                parseFloat(item?.sale_price) *
                parseFloat(value?.quantity) *
                parseFloat(item?.tax / 100);
            } else {
              failed_400(res, "Item not found");
            }
          }

          const invoice_data = new invoice({
            invoice_number: invoice_number,
            customer: customer,
            date_from: date_from,
            date_to: date_to,
            total: total_amount,
            tax_amount: tax_amount,
            grand_total: parseFloat(total_amount) + parseFloat(tax_amount),
            invoice_status: invoice_status ? invoice_status : "Pending",
            payment_status: payment_status ? payment_status : "Unpaid",
            status: status ? status : 0,
            ref: authorize?.ref,
            branch: authorize?.branch,
            created: new Date(),
            updated: new Date(),
            created_by: authorize?.id,
          });

          const invoiceToSave = await invoice_data?.save();

          for (const value of details) {
            const item = await items.findById(value?.id);

            if (item) {
              const invoiceDetails = new invoice_details({
                invoice_id: invoiceToSave?._id,
                item_id: item?._id,
                item_name: item?.name,
                item_unit: item?.unit,
                item_quantity: value?.quantity,
                received_quantity: 0,
                item_price: item?.sale_price,
                amount:
                  parseFloat(item?.sale_price) * parseFloat(value?.quantity),
                item_discount: 0,
                discount_amount: 0,
                item_tax: item?.tax,
                total:
                  (parseFloat(item?.sale_price) +
                    (parseFloat(item?.sale_price) * parseFloat(item?.tax)) /
                      100) *
                  parseFloat(value?.quantity),
                received_amount: 0,
              });

              const detailsToSave = await invoiceDetails.save();
            } else {
              failed_400(res, "Item not found");
            }
          }

          const dataToSave = {
            invoiceToSave,
          };

          success_200(res, "Invoice Created");
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
        invoice_number,
        customer,
        date_from,
        date_to,
        invoice_status,
        payment_status,
        status,
        branch,
        details,
      } = req?.body;

      if (
        !id ||
        !invoice_number ||
        !customer ||
        !date_from ||
        !date_to ||
        !invoice_status ||
        details?.length <= 0
      ) {
        incomplete_400(res);
      } else {
        const existing_user = await invoice?.findOne({ _id: id });
        if (existing_user) {
          const existing_invoice = await invoice?.findOne({
            _id: { $ne: id },
            invoice_number: invoice_number,
            branch: authorize?.branch,
          });

          if (existing_invoice) {
            error_400(res, 401, "Invoice number exists");
          } else {
            let total_amount = 0;
            let tax_amount = 0;

            for (const value of details) {
              const item = await items.findById(value?.id);

              if (item) {
                total_amount +=
                  parseFloat(value?.quantity) * parseFloat(item?.sale_price);
                tax_amount +=
                  parseFloat(item?.sale_price) *
                  parseFloat(value?.quantity) *
                  parseFloat(item?.tax / 100);
              } else {
                failed_400(res, "Item not found");
              }
            }

            existing_user.invoice_number = invoice_number ? invoice_number : "";
            existing_user.customer = customer ? customer : "";
            existing_user.date_from = date_from ? date_from : "";
            existing_user.date_to = date_to ? date_to : "";
            existing_user.branch = branch ? branch : existing_user.branch;
            existing_user.total = total_amount;
            existing_user.tax_amount = tax_amount;
            existing_user.grand_total =
              parseFloat(total_amount) + parseFloat(tax_amount);
            existing_user.invoice_status = invoice_status
              ? invoice_status
              : "Pending";
            existing_user.payment_status = payment_status
              ? payment_status
              : "Unpaid";
            existing_user.status = status ? status : 0;

            const dataToUpdate = await existing_user.save();

            const delteDetails = await invoice_details.deleteMany({
              invoice_id: id,
            });

            for (const value of details) {
              const item = await items.findById(value?.id);

              if (item) {
                const invoiceDetails = new invoice_details({
                  invoice_id: id,
                  item_id: item?._id,
                  item_name: item?.name,
                  item_unit: item?.unit,
                  item_quantity: value?.quantity,
                  received_quantity: 0,
                  item_price: item?.sale_price,
                  amount:
                    parseFloat(item?.sale_price) * parseFloat(value?.quantity),
                  item_discount: 0,
                  discount_amount: 0,
                  item_tax: item?.tax,
                  total:
                    (parseFloat(item?.sale_price) +
                      (parseFloat(item?.sale_price) * parseFloat(item?.tax)) /
                        100) *
                    parseFloat(value?.quantity),
                  received_amount: 0,
                });

                const detailsToSave = await invoiceDetails.save();
              } else {
                failed_400(res, "Item not found");
              }
            }
            success_200(res, "Invoice Updated");
          }
        } else {
          failed_400(res, "Invoice not found");
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
      const { id } = req?.params;
      const invoice_data = await invoice
        ?.findById(id)
        .populate("customer")
        .populate({ path: "created_by", select: "-password" });
      if (invoice_data) {
        const invoice_detail = await invoice_details?.find({
          invoice_id: id,
        });

        const get_customer = await customers?.find({
          branch: authorize?.branch,
        });
        const get_items = await items?.find({ branch: authorize?.branch });

        const data = {
          invoice_data,
          invoice_detail,
          customers: get_customer,
          items: get_items,
        };
        success_200(res, "", data);
      } else {
        failed_400(res, "Invoice not found");
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_invoice = async (req, res) => {
  try {
    const authorize = authorization(req);

    const { search, date_from } = req?.body;

    if (authorize) {
      let query = { branch: authorize?.branch };
      date_from && (query.date_from = { $gte: new Date(date_from) });
      search && (query.invoice_number = { $regex: search, $options: "i" });

      const invoice_data = await invoice
        ?.find(query)
        .populate({ path: "customer", select: ["name"] })
        .populate({
          path: "quote_number",
          select: ["quote_number", "created_by"],
          populate: { path: "created_by", select: "-password" },
        })
        .populate({ path: "created_by", select: ["first_name", "last_name"] });
      if (invoice_data) {
        success_200(res, "", invoice_data);
      } else {
        failed_400(res, "Invoice not found");
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const create_invoice_payment = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const { invoice_id, amount, type, payment_status, status } = req?.body;
      if (!invoice_id || !amount || !type) {
        incomplete_400(res);
      } else {
        const existing_invoice = await invoice.findById(invoice_id);

        if (existing_invoice) {
          if (
            parseFloat(amount) + parseFloat(existing_invoice.received_amount) <=
            parseFloat(existing_invoice?.grand_total)
          ) {
            const payment = new invoice_payment({
              invoice_id: invoice_id,
              amount: amount ? amount : 0,
              type: type,
              payment_status: "Received",
              status: status ? status : 0,
              ref: authorize?.ref,
              branch: authorize?.branch,
              created: new Date(),
              updated: new Date(),
              created_by: authorize?.id,
              updated_by: authorize?.id,
            });

            existing_invoice.received_amount =
              parseFloat(existing_invoice.received_amount) + parseFloat(amount);

            if (
              parseFloat(existing_invoice.received_amount) ==
              parseFloat(existing_invoice.grand_total)
            ) {
              existing_invoice.payment_status = "Paid";
            }

            const invoicePaymentSave = await payment.save();
            const invoiceToUpdate = await existing_invoice.save();
            if (invoicePaymentSave && invoiceToUpdate) {
              success_200(res, "Payment created");
            } else {
              failed_400(res, "Payment not created");
            }
          } else {
            failed_400(res, "Invalid amount");
          }
        } else {
          failed_400(res, "Invoice not found");
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const update_invoice_payment = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const { id, invoice_id, amount, type, payment_status, status } =
        req?.body;
      if (!id || !invoice_id || !amount || !type) {
        incomplete_400(res);
      } else {
        const existing_invoice = await invoice.findById(invoice_id);

        if (existing_invoice) {
          const existing_invoice_payment = await invoice_payment?.findById(id);
          if (existing_invoice_payment) {
            existing_invoice.received_amount =
              parseFloat(existing_invoice.received_amount) -
              parseFloat(existing_invoice_payment.amount);

            const inoiceToSave = await existing_invoice.save();

            if (inoiceToSave) {
              if (
                parseFloat(amount) +
                  parseFloat(existing_invoice.received_amount) <=
                parseFloat(existing_invoice?.grand_total)
              ) {
                if (existing_invoice_payment) {
                  existing_invoice_payment.invoice_id = invoice_id;
                  existing_invoice_payment.amount = amount ? amount : 0;
                  existing_invoice_payment.type = type;
                  existing_invoice_payment.payment_status = "Received";
                  existing_invoice_payment.status = status ? status : 0;
                  existing_invoice_payment.ref = authorize?.ref;
                  existing_invoice_payment.branch = authorize?.branch;
                  existing_invoice_payment.created = new Date();
                  existing_invoice_payment.updated = new Date();
                  existing_invoice_payment.updated_by = authorize?.id;

                  existing_invoice.received_amount =
                    parseFloat(existing_invoice.received_amount) +
                    parseFloat(amount);

                  if (
                    parseFloat(existing_invoice.received_amount) ==
                    parseFloat(existing_invoice.grand_total)
                  ) {
                    existing_invoice.payment_status = "Paid";
                  }

                  const invoicePaymentUpdate =
                    await existing_invoice_payment.save();
                  const invoiceToUpdate = await existing_invoice.save();
                  if (invoicePaymentUpdate) {
                    success_200(res, "Payment updated");
                  } else {
                    failed_400(res, "Payment not updated");
                  }
                } else {
                  failed_400(res, "Payment not found");
                }
              } else {
                failed_400(res, "Invalid amount");
              }
            } else {
              failed_400(res, "Invoice not updated");
            }
          } else {
            failed_400(res, "Invoice payment not found");
          }
        } else {
          failed_400(res, "Invoice not found");
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  get_next_invoice,
  get_create_invoice,
  create_invoice,
  update_invoice,
  get_invoice,
  get_all_invoice,
  create_invoice_payment,
  update_invoice_payment,
};
