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
const users = require("../Models/users");

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
    catch_400(res, errors?.message);
  }
};

const get_create_deliveries = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const { id } = req?.params;
      const delivery_number = await get_next_delivery(req, res, 1000);
      const invoice_data = await invoice?.findById(id);

      if (invoice_data) {
        const invoice_detail = await invoice_details?.find({
          invoice_id: id,
        });

        const user_data = await users?.find({
          branch: authorize?.branch,
        });

        const data = {
          delivery_number: delivery_number,
          invoice_data,
          invoice_detail,
          user: user_data,
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
        invoice_id,
        delivery_number,
        po_number,
        delivered_by,
        date,
        delivery_status,
        status,
        details,
      } = req?.body;

      if (
        !invoice_id ||
        !delivery_number ||
        !date ||
        !delivery_status ||
        details?.length <= 0
      ) {
        incomplete_400(res);
      } else {
        const existing_delivery = await deliveries?.findOne({
          delivery_number: delivery_number,
        });

        if (existing_delivery) {
          failed_400(res, "Delivery number exists");
        } else {
          const existing_invoice = await invoice?.findById(invoice_id);
          const existing_invoice_details = await invoice_details?.find({
            invoice_id: invoice_id,
          });

          if (existing_invoice) {
            let total_amount = 0;
            let tax_amount = 0;
            let deliveryCount = 0;

            for (const value of details) {
              const existing_invoice_detail = await invoice_details.findById(
                value?.id
              );

              if (existing_invoice_detail) {
                if (
                  parseFloat(value?.quantity) <=
                  parseFloat(existing_invoice_detail?.item_quantity)
                ) {
                  total_amount +=
                    parseFloat(value?.quantity) *
                    parseFloat(existing_invoice_detail?.item_price);
                  tax_amount +=
                    parseFloat(existing_invoice_detail?.item_price) *
                    parseFloat(value?.quantity) *
                    parseFloat(existing_invoice_detail?.item_tax / 100);
                  deliveryCount++;
                } else {
                  failed_400(res, "Invalid Quantity");
                }
              } else {
                failed_400(res, "Item not found");
              }
            }

            if (details?.length == deliveryCount) {
              const delivery = new deliveries({
                delivery_number: delivery_number,
                invoice_id: invoice_id,
                po_number: po_number,
                customer: existing_invoice?.customer,
                delivered_by: delivered_by,
                date: new Date(),
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

              let received_quantity = 0;
              for (const value of details) {
                const existing_invoice_detail = await invoice_details.findById(
                  value?.id
                );

                if (existing_invoice_detail) {
                  if (
                    parseFloat(value?.quantity) <=
                    parseFloat(existing_invoice_detail?.item_quantity)
                  ) {
                    const deliveryDetais = new delivery_details({
                      delivery_id: deliveryToSave?._id,
                      invoice_detail_id: existing_invoice_detail?.id,
                      item_id: existing_invoice_detail?.item_id,
                      item_name: existing_invoice_detail?.item_name,
                      item_unit: existing_invoice_detail?.item_unit,
                      item_quantity: value?.quantity,
                      item_price: existing_invoice_detail?.item_price,
                      amount:
                        parseFloat(existing_invoice_detail?.item_price) *
                        parseFloat(value?.quantity),
                      item_discount: 0,
                      discount_amount: 0,
                      item_tax: existing_invoice_detail?.item_tax,
                      total:
                        (parseFloat(existing_invoice_detail?.item_price) +
                          (parseFloat(existing_invoice_detail?.item_price) *
                            parseFloat(existing_invoice_detail?.item_tax)) /
                            100) *
                        parseFloat(value?.quantity),
                    });

                    if (
                      parseFloat(existing_invoice_detail?.item_quantity) ==
                      parseFloat(value?.quantity)
                    ) {
                      received_quantity++;
                    }

                    existing_invoice_detail.received_quantity = value?.quantity;
                    const detailsToUpdate =
                      await existing_invoice_detail.save();
                    const detailsToSave = await deliveryDetais.save();
                  } else {
                    failed_400(res, "Invalid Delivery");
                  }
                } else {
                  failed_400(res, "Item not found");
                }
              }

              if (existing_invoice_details?.length == received_quantity) {
                existing_invoice.invoice_status = "Delivered";
                const dataToUpdate = await existing_invoice.save();
                success_200(res, "Delivered");
              } else {
                success_200(res, "Delivery Created");
              }
            } else {
              failed_400(res, "Delivery not created");
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

const update_deliveries = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const {
        id,
        invoice_id,
        delivery_number,
        po_number,
        delivered_by,
        date,
        delivery_status,
        status,
        details,
      } = req?.body;

      if (
        !id ||
        !invoice_id ||
        !delivery_number ||
        !date ||
        !delivery_status ||
        details?.length <= 0
      ) {
        incomplete_400(res);
      } else {
        const existing_delivery = await deliveries?.findOne({
          _id: id,
        });

        if (existing_delivery) {
          const existing_delivery_number = await deliveries?.findOne({
            _id: { $ne: id },
            delivery_number: delivery_number,
            branch: authorize?.branch,
          });

          if (existing_delivery_number) {
            failed_400(res, "Delivery Number Exists");
          } else {
            const existing_invoice = await invoice?.findById(invoice_id);
            const existing_delivery_details = await invoice_details?.find({
              invoice_id: invoice_id,
            });

            if (existing_invoice) {
              let total_amount = 0;
              let tax_amount = 0;
              let deliveryCount = 0;

              for (const value of details) {
                const existing_invoice_detail = await invoice_details.findById(
                  value?.id
                );
                const existing_delivery_detail = await delivery_details.findOne(
                  { invoice_detail_id: existing_invoice_detail?._id }
                );

                if (existing_invoice_detail) {
                  if (
                    parseFloat(value?.quantity) <=
                    parseFloat(existing_invoice_detail?.item_quantity)
                  ) {
                    total_amount +=
                      parseFloat(value?.quantity) *
                      parseFloat(existing_invoice_detail?.item_price);
                    tax_amount +=
                      parseFloat(existing_invoice_detail?.item_price) *
                      parseFloat(value?.quantity) *
                      parseFloat(existing_invoice_detail?.item_tax / 100);

                    if (existing_delivery_detail) {
                      existing_invoice_detail.received_quantity =
                        parseFloat(existing_invoice_detail?.received_quantity) -
                        parseFloat(existing_delivery_detail?.item_quantity);
                      const detailsToUpdate =
                        await existing_invoice_detail.save();
                      deliveryCount++;
                    } else {
                      deliveryCount++;
                    }
                  } else {
                    failed_400(res, "Invalid Quantity");
                  }
                } else {
                  failed_400(res, "Item not found");
                }
              }

              if (details?.length == deliveryCount) {
                existing_delivery.delivery_number = delivery_number;
                existing_delivery.invoice_id = invoice_id;
                existing_delivery.po_number = po_number;
                existing_delivery.customer = existing_invoice?.customer;
                existing_delivery.delivered_by = delivered_by;
                existing_delivery.date = new Date();
                existing_delivery.total = total_amount;
                existing_delivery.tax_amount = tax_amount;
                existing_delivery.grand_total =
                  parseFloat(total_amount) + parseFloat(tax_amount);
                existing_delivery.delivery_status = delivery_status
                  ? delivery_status
                  : "Pending";
                existing_delivery.status = status ? status : 0;
                existing_delivery.ref = authorize?.ref;
                existing_delivery.branch = authorize?.branch;
                existing_delivery.created = new Date();
                existing_delivery.updated = new Date();
                existing_delivery.created_by = authorize?.id;

                const deliveryToUpdate = await existing_delivery?.save();
                const deleteDeliveryDetails =
                  await delivery_details?.deleteMany({ delivery_id: id });

                let received_quantity = 0;
                for (const value of details) {
                  const existing_invoice_detail =
                    await invoice_details.findById(value?.id);

                  if (existing_invoice_detail) {
                    if (
                      parseFloat(value?.quantity) <=
                      parseFloat(existing_invoice_detail?.item_quantity)
                    ) {
                      const deliveryDetais = new delivery_details({
                        delivery_id: deliveryToUpdate?._id,
                        invoice_detail_id: existing_invoice_detail?.id,
                        item_id: existing_invoice_detail?.item_id,
                        item_name: existing_invoice_detail?.item_name,
                        item_unit: existing_invoice_detail?.item_unit,
                        item_quantity: value?.quantity,
                        item_price: existing_invoice_detail?.item_price,
                        amount:
                          parseFloat(existing_invoice_detail?.item_price) *
                          parseFloat(value?.quantity),
                        item_discount: 0,
                        discount_amount: 0,
                        item_tax: existing_invoice_detail?.item_tax,
                        total:
                          (parseFloat(existing_invoice_detail?.item_price) +
                            (parseFloat(existing_invoice_detail?.item_price) *
                              parseFloat(existing_invoice_detail?.item_tax)) /
                              100) *
                          parseFloat(value?.quantity),
                      });

                      if (
                        parseFloat(existing_invoice_detail?.item_quantity) ==
                        parseFloat(value?.quantity)
                      ) {
                        received_quantity++;
                      }

                      existing_invoice_detail.received_quantity =
                        value?.quantity;
                      const detailsToUpdate =
                        await existing_invoice_detail.save();
                      const detailsToSave = await deliveryDetais.save();
                    } else {
                      failed_400(res, "Invalid Delivery");
                    }
                  } else {
                    failed_400(res, "Item not found");
                  }
                }

                if (existing_delivery_details?.length == received_quantity) {
                  existing_invoice.invoice_status = "Delivered";
                  const dataToUpdate = await existing_invoice.save();
                  success_200(res, "Delivered");
                } else {
                  existing_invoice.invoice_status = "Sent";
                  const dataToUpdate = await existing_invoice.save();
                  success_200(res, "Delivery Updated");
                }
              } else {
                failed_400(res, "Delivery not created");
              }
            } else {
              failed_400(res, "Invoice don't exists");
            }
          }
        } else {
          failed_400(res, "Delivery not found");
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
          delivery_id: id,
        });

        const data = {
          delivery,
          delieryDetails,
        };
        success_200(res, "", data);
      } else {
        failed_400(res, errors?.message);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_deliveries = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const deliveries_data = await deliveries
        ?.find({
          branch: authorize?.branch,
        })
        .select(["delivery_number", "date", "delivery_status", "status"])
        .populate({ path: "customer", select: ["name"] })
        .populate({
          path: "delivered_by",
          select: ["first_name", "last_name"],
        });
      if (deliveries_data) {
        success_200(res, "", deliveries_data);
      } else {
        failed_400(res, "", "Deliveries not Found");
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  get_next_delivery,
  get_create_deliveries,
  create_deliveries,
  update_deliveries,
  get_deliveries,
  get_all_deliveries,
};
