const deliveries = require("../Models/deliveries");
const { authorization } = require("../Global/authorization");
const {
  unauthorized,
  incomplete_400,
  error_400,
  failed_400,
  success_200,
  catch_400,
} = require("../Global/errors");
const invoice_details = require("../Models/invoice_details");
const invoice = require("../Models/invoice");
const items = require("../Models/items");
const delivery_details = require("../Models/delivery_details");

const get_next_delivery = async (req, res, number) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const total_deliveries = await deliveries?.countDocuments({
        branch: authorize?.branch,
      });

      const next_delivery_number = number + total_deliveries;

      const existing_delivery_number = await deliveries.findOne({
        delivery_number: next_delivery_number,
        branch: authorize?.branch,
      });

      if (existing_delivery_number) {
        return await get_next_delivery(req, res, type, next_delivery_number);
      } else {
        return next_delivery_number;
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res);
  }
};

const get_create_deliveries = async (req, res) => {
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
        const delivery_number = await get_next_delivery(req, res, 1000);

        const data = {
          delivery_number: delivery_number,
          invoice_data,
          invoice_detail,
        };
        success_200(res, "", data);
      } else {
        failed_400(res, "Invoice not found");
      }
      success_200(res, "");
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const create_deliveries = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const {
        delivery_number,
        invoice_id,
        po_number,
        customer,
        delivered_by,
        date,
        status,
        details,
      } = req?.body;

      if (!invoice_id) {
        incomplete_400(res);
      } else {
        const existing_delivery = await deliveries?.findOne({
          delivery_number: delivery_number,
        });

        if (existing_delivery) {
          failed_400(res, "Delivery number exists");
        } else {
          const existing_invoice = await invoice?.findById(invoice_id);
          if (existing_invoice) {
            let total_amount = 0;
            let tax_amount = 0;

            for (const value of details) {
              const item = await items.findById(value?.id);

              if (item) {
                total_amount +=
                  parseFloat(value?.quantity) *
                  parseFloat(value?.data?.sale_price);
                tax_amount +=
                  parseFloat(value?.data?.sale_price) *
                  parseFloat(value?.quantity) *
                  parseFloat(item?.tax / 100);
              } else {
                failed_400(res, "Item not found");
              }
            }

            const delivery = new deliveries({
              delivery_number: delivery_number,
              invoice_id: invoice_id,
              po_number: po_number,
              customer: customer,
              delivered_by: delivered_by,
              date: date,
              total: total_amount,
              tax_amount: tax_amount,
              grand_total: parseFloat(total_amount) + parseFloat(tax_amount),
              delivery_status: delivery_status ? delivery_status : "Pending",
              status: status ? status : 0,
              ref: authorize?.ref,
              branch: authorize?.branch,
              created: new Date(),
              updated: new Date(),
              created_by: authorize?.id,
            });

            const deliveryToSave = await delivery?.save();

            for (const value of details) {
              const item = await items.findById(value?.id);

              if (item) {
                const deliveryDetais = new delivery_details({
                  delivery_id: deliveryToSave?._id,
                  item_id: item?._id,
                  item_name: item?.name,
                  item_unit: item?.unit,
                  item_quantity: value?.quantity,
                  item_price: value?.data?.sale_price,
                  amount:
                    parseFloat(value?.data?.sale_price) *
                    parseFloat(value?.quantity),
                  item_discount: 0,
                  discount_amount: 0,
                  item_tax: item?.tax,
                  total:
                    (parseFloat(value?.data?.sale_price) +
                      (parseFloat(value?.data?.sale_price) *
                        parseFloat(item?.tax)) /
                        100) *
                    parseFloat(value?.quantity),
                });

                const detailsToSave = await deliveryDetais.save();
              } else {
                failed_400(res, "Item not found");
              }
            }
          } else {
            failed_400(res, "Invoice don't exists");
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

const get_deliveries = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const { id } = req?.params;
      const delivery = await deliveries?.findById(id)?.populate("customer");
      if (delivery) {
        const delieryDetails = await delivery_details?.find({
          deliver_id: id,
        });

        const data = {
          delivery,
          delieryDetails,
        };
        success_200(res, "", data);
      } else {
        error_400(res, errors?.message);
      }
    }
  } catch (errors) {
    catch_400(res);
  }
};

module.exports = {
  get_next_delivery,
  get_create_deliveries,
  create_deliveries,
  get_deliveries,
};
