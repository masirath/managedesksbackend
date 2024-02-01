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
const items = require("../Models/items");
const suppliers = require("../Models/suppliers");
const purchase_details = require("../Models/purchase_details");

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
      const get_supplier = await suppliers.find({
        branch: authorize?.branch,
      });
      const get_items = await items.find({ branch: authorize?.branch });
      const purchase_number = await get_next_purchase(req, res, 1000);

      const data = {
        purchase_number: purchase_number,
        items: get_items,
        suppliers: get_supplier,
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

      if (!purchase_number || !supplier || !date_from) {
        incomplete_400(res);
      } else {
        const existing_purchase = await purchases.findOne({
          purchase_number: purchase_number,
        });

        if (existing_purchase) {
          failed_400(res, "Purchase Number exists");
        } else {
          const existing_supplier = await suppliers?.findById(supplier);

          if (existing_supplier) {
            let total_amount = 0;
            let tax_amount = 0;

            for (const value of details) {
              const item = await items.findById(value?.id);

              if (item) {
                total_amount +=
                  parseFloat(value?.quantity) *
                  parseFloat(item?.purchase_price);
                tax_amount +=
                  parseFloat(item?.purchase_price) *
                  parseFloat(value?.quantity) *
                  parseFloat(item?.tax / 100);
              } else {
                failed_400(res, "Item not found");
              }
            }

            const purchase = new purchases({
              purchase_number: purchase_number,
              supplier: existing_supplier?._id,
              supplier_name: existing_supplier?.name,
              supplier_email: existing_supplier?.email,
              supplier_phone: existing_supplier?.phone,
              supplier_area: existing_supplier?.area,
              supplier_city: existing_supplier?.city,
              supplier_state: existing_supplier?.state,
              supplier_country: existing_supplier?.country,
              supplier_tax: existing_supplier?.tax_number,
              reference: reference,
              date_from: date_from,
              date_to: date_to,
              total: total_amount,
              tax_amount: tax_amount,
              grand_total: parseFloat(total_amount) + parseFloat(tax_amount),
              purchase_status: purchase_status ? purchase_status : "Pending",
              payment_status: payment_status ? payment_status : "Unpaid",
              paid_amount: paid_amount ? paid_amount : 0,
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
                  const purchaseDetails = new purchase_details({
                    purchase_id: purchaseToSave?._id,
                    item_id: item?._id,
                    item_name: item?.name,
                    item_unit: item?.unit,
                    item_quantity: value?.quantity,
                    received_quantity: 0,
                    item_price: item?.purchase_price,
                    amount:
                      parseFloat(item?.purchase_price) *
                      parseFloat(value?.quantity),
                    item_discount: 0,
                    discount_amount: 0,
                    item_tax: item?.tax,
                    total:
                      (parseFloat(item?.purchase_price) +
                        (parseFloat(item?.purchase_price) *
                          parseFloat(item?.tax)) /
                          100) *
                      parseFloat(value?.quantity),
                    received_amount: 0,
                  });

                  const detailsToSave = await purchaseDetails.save();
                } else {
                  failed_400(res, "Details Item not found");
                }
              }

              const dataToSave = {
                purchaseToSave,
              };

              success_200(res, "Purchase Created");
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

const update_purchase = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const {
        id,
        purchase_number,
        supplier,
        date_from,
        date_to,
        purchase_status,
        payment_status,
        paid_amount,
        status,
        branch,
        details,
      } = req?.body;

      if (
        !id ||
        !purchase_number ||
        !supplier ||
        !date_from ||
        details?.length <= 0
      ) {
        incomplete_400(res);
      } else {
        const purchase = await purchases?.findOne({ _id: id });
        if (purchase) {
          const existing_purchase = await purchases?.findOne({
            _id: { $ne: id },
            purchase_number: purchase_number,
            branch: authorize?.branch,
          });

          if (existing_purchase) {
            error_400(res, 401, "Purchase number exists");
          } else {
            const existing_supplier = await suppliers?.findById(supplier);

            if (existing_supplier) {
              let total_amount = 0;
              let tax_amount = 0;

              for (const value of details) {
                const item = await items.findById(value?.id);

                if (item) {
                  total_amount +=
                    parseFloat(value?.quantity) *
                    parseFloat(item?.purchase_price);
                  tax_amount +=
                    parseFloat(item?.purchase_price) *
                    parseFloat(value?.quantity) *
                    parseFloat(item?.tax / 100);
                } else {
                  failed_400(res, "Item not found");
                }
              }

              purchase.purchase_number = purchase_number ? purchase_number : "";
              purchase.supplier = existing_supplier?._id
                ? existing_supplier?._id
                : "";
              purchase.supplier_name = existing_supplier?.name
                ? existing_supplier?.name
                : "";
              purchase.supplier_email = existing_supplier?.email
                ? existing_supplier?.email
                : "";
              purchase.supplier_phone = existing_supplier?.phone
                ? existing_supplier?.phone
                : "";
              purchase.supplier_area = existing_supplier?.area
                ? existing_supplier?.area
                : "";
              purchase.supplier_city = existing_supplier?.city
                ? existing_supplier?.city
                : "";
              purchase.supplier_state = existing_supplier?.state
                ? existing_supplier?.state
                : "";
              purchase.supplier_country = existing_supplier?.country
                ? existing_supplier?.country
                : "";
              purchase.supplier_tax = existing_supplier?.tax_number
                ? existing_supplier?.tax_number
                : "";
              purchase.date_from = date_from ? date_from : "";
              purchase.date_to = date_to ? date_to : "";
              purchase.branch = branch ? branch : purchase.branch;
              purchase.total = total_amount;
              purchase.tax_amount = tax_amount;
              purchase.grand_total =
                parseFloat(total_amount) + parseFloat(tax_amount);
              purchase.purchase_status = purchase_status
                ? purchase_status
                : "Pending";
              purchase.payment_status = payment_status
                ? payment_status
                : "Unpaid";
              purchase.paid_amount = paid_amount ? paid_amount : 0;
              purchase.status = status ? status : 0;

              const dataToUpdate = await purchase.save();

              const delteDetails = await purchase_details.deleteMany({
                purchase_id: id,
              });

              for (const value of details) {
                const item = await items.findById(value?.id);

                if (item) {
                  const purchaseDetails = new purchase_details({
                    purchase_id: id,
                    item_id: item?._id,
                    item_name: item?.name,
                    item_unit: item?.unit,
                    item_quantity: value?.quantity,
                    received_quantity: 0,
                    item_price: item?.purchase_price,
                    amount:
                      parseFloat(item?.purchase_price) *
                      parseFloat(value?.quantity),
                    item_discount: 0,
                    discount_amount: 0,
                    item_tax: item?.tax,
                    total:
                      (parseFloat(item?.purchase_price) +
                        (parseFloat(item?.purchase_price) *
                          parseFloat(item?.tax)) /
                          100) *
                      parseFloat(value?.quantity),
                    received_amount: 0,
                  });

                  const detailsToSave = await purchaseDetails.save();
                } else {
                  failed_400(res, "Item not found");
                }
              }
              success_200(res, "Purchase Updated");
            } else {
              failed_400(res, "Supplier not found");
            }
          }
        } else {
          failed_400(res, "Purchase not found");
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_purchase = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const { id } = req?.params;
      const purchase_data = await purchases
        ?.findById(id)
        .populate("supplier")
        .populate({ path: "created_by", select: "-password" });
      if (purchase_data) {
        const purchase_detail = await purchase_details?.find({
          purchase_id: id,
        });

        const get_suppliers = await suppliers?.find({
          branch: authorize?.branch,
        });
        const get_items = await items?.find({ branch: authorize?.branch });

        const data = {
          purchase_data,
          purchase_detail,
          suppliers: get_suppliers,
          items: get_items,
        };
        success_200(res, "", data);
      } else {
        failed_400(res, "Purchase not found");
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_purchases = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const { search, date_from } = req?.body;

      let query = { branch: authorize?.branch };
      date_from && (query.date_from = { $gte: new Date(date_from) });
      search && (query.purchase_number = { $regex: search, $options: "i" });

      const purchase_data = await purchases
        ?.find(query)
        .populate({ path: "supplier", select: ["name"] })
        .populate({ path: "created_by", select: ["first_name", "last_name"] });

      if (purchase_data) {
        success_200(res, "", purchase_data);
      } else {
        failed_400(res, "Purchase not found");
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  get_create_purchase,
  create_purchase,
  update_purchase,
  get_purchase,
  get_all_purchases,
};
