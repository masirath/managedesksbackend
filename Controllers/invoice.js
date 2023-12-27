const invoice = require("../Models/invoice");
const invoice_details = require("../Models/invoice_details");
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
        status,
        branch,
        details,
      } = req?.body;
      if (
        !invoice_number ||
        !customer ||
        !date_from ||
        !date_to ||
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

    if (authorize) {
      const invoice_data = await invoice
        ?.find({
          branch: authorize?.branch,
        })
        .populate("customer")
        .populate({
          path: "quote_number",
          populate: { path: "created_by", select: "-password" },
        })
        .populate({ path: "created_by", select: "-password" });
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

module.exports = {
  get_next_invoice,
  get_create_invoice,
  create_invoice,
  update_invoice,
  get_invoice,
  get_all_invoice,
};
