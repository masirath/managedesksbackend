const purchases = require("../Models/purchases");
const { authorization } = require("../Global/authorization");
const {
  catch_400,
  unauthorized,
  incomplete_400,
  failed_400,
  success_200,
} = require("../Global/errors");
const { find } = require("../Models/suppliers");
const customers = require("../Models/customers");
const users = require("../Models/users");
const items = require("../Models/items");
const suppliers = require("../Models/suppliers");

const get_next_purchase = async (req, res, number) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const total_purchase = await purchases.countDocuments({
        branch: authorize?.branch,
      });

      const next_purchase_number = number + total_purchase;

      const existing_purchase_number = await purchases.findOne({
        purchase_number: next_purchase_number,
        branch: authorize?.branch,
      });

      if (existing_purchase_number) {
        return await get_next_purchase(req, res, type, next_purchase_number);
      } else {
        return next_purchase_number;
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_create_purchase = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const get_user = await users.find({
        branch: authorize?.branch,
        role: { $ne: "SUPERADMIN" },
      });
      const get_items = await items.find({ branch: authorize?.branch });
      const purchase_number = await get_next_purchase(req, res, 1000);

      const data = {
        purchase_number: purchase_number,
        items: get_items,
        users: get_user,
      };

      success_200(res, "", data);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const create_purchase = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const {
        purchase_number,
        supplier,
        reference,
        date_from,
        date_to,
        purchase_status,
        payment_status,
        paid_amount,
        status,
        branch,
        details,
      } = req?.body;

      if (!purchase_number || !supplier || !date_from || !purchase_status) {
        incomplete_400(res);
      } else {
        const existing_purchase = await find({
          purchase_number: purchase_number,
        });

        if (existing_purchase) {
          failed_400(res, "Purchase Number exists");
        } else {
          const is_supplier = suppliers?.findById(supplier);
          if (is_supplier) {
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

            const purchase = new purchases({
              purchase_number: purchase_number,
              supplier: supplier,
              reference: reference,
              date_from: date_from,
              date_to: date_to,
              total: total_amount,
              tax_amount: tax_amount,
              grand_total: parseFloat(total_amount) + parseFloat(tax_amount),
              purchase_status: purchase_status ? purchase_status : "Pending",
              payment_status: payment_status ? payment_status : "Unpaid",
              paid_amount: paid_amount,
              status: status ? status : 0,
              ref: authorize?.ref,
              branch: authorize?.branch,
              created: new Date(),
              updated: new Date(),
              created_by: authorize?.id,
            });

            const purchaseToSave = await purchase?.save();

            if (purchaseToSave) {
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
                      parseFloat(item?.sale_price) *
                      parseFloat(value?.quantity),
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
                  failed_400(res, "Details Item not found");
                }

                const dataToSave = {
                  invoiceToSave,
                };

                success_200(res, "purchase Created");
              }
            } else {
              failed_400(res, "Purchase not created");
            }
          } else {
            failed_400(res, "Supplier not found");
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

module.exports = { get_create_purchase, create_purchase };
