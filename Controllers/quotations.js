const quotations = require("../Models/quotations");
const customers = require("../Models/customers");
const items = require("../Models/items");
const quotation_details = require("../Models/quotation_details");
const {
  catch_400,
  incomplete_400,
  error_400,
  unauthorized,
  success_200,
  failed_400,
} = require("../Global/errors");
const { authorization } = require("../Global/authorization");

const get_next_number = async (req, res, number) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const total_quotes = await quotations.countDocuments({
        branch: authorize?.branch,
      });

      const next_quote_number = number + total_quotes;

      const existing_quote_number = await quotations.findOne({
        quote_number: next_quote_number,
        branch: authorize?.branch,
      });

      if (existing_quote_number) {
        return await get_next_number(req, res, next_quote_number);
      } else {
        return next_quote_number;
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res);
  }
};

const get_create_quotation = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const get_customers = await customers.find({ branch: authorize?.branch });
      const get_items = await items.find({ branch: authorize?.branch });
      const quote_number = await get_next_number(req, res, 1000);

      const data = {
        quote_number: quote_number,
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

const create_quotation = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const {
        quote_number,
        customer,
        date_from,
        date_to,
        status,
        branch,
        details,
      } = req?.body;

      if (
        !quote_number ||
        !customer ||
        !date_from ||
        !date_to ||
        details?.length <= 0
      ) {
        incomplete_400(res);
      } else {
        const existing_quotation = await quotations?.findOne({
          quote_number: quote_number,
          branch: authorize?.branch,
        });

        if (existing_quotation) {
          error_400(res, 401, "Quote number exists");
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

          const quote = new quotations({
            quote_number: quote_number,
            customer: customer,
            date_from: date_from,
            date_to: date_to,
            total: total_amount,
            tax_amount: tax_amount,
            grand_total: parseFloat(total_amount) + parseFloat(tax_amount),
            quotation_status: "Pending",
            status: status ? status : 0,
            ref: authorize?.ref,
            branch: authorize?.branch,
            created: new Date(),
            updated: new Date(),
            created_by: authorize?.id,
          });

          const quoteToSave = await quote?.save();

          for (const value of details) {
            const item = await items.findById(value?.id);

            if (item) {
              const quoteDetails = new quotation_details({
                quotation_id: quoteToSave?._id,
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

              const detailsToSave = await quoteDetails.save();
            } else {
              failed_400(res, "Item not found");
            }
          }

          const dataToSave = {
            quoteToSave,
          };

          success_200(res, "Quotation Created");
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const update_quotation = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const {
        id,
        quote_number,
        customer,
        date_from,
        date_to,
        status,
        branch,
        details,
      } = req?.body;

      if (
        !id ||
        !quote_number ||
        !customer ||
        !date_from ||
        !date_to ||
        details?.length <= 0
      ) {
        incomplete_400(res);
      } else {
        const existing_user = await quotations?.findOne({ _id: id });
        if (existing_user) {
          const existing_quotation = await quotations?.findOne({
            _id: { $ne: id },
            quote_number: quote_number,
            branch: authorize?.branch,
          });

          if (existing_quotation) {
            error_400(res, 401, "Quote number exists");
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

            existing_user.quote_number = quote_number ? quote_number : "";
            existing_user.customer = customer ? customer : "";
            existing_user.date_from = date_from ? date_from : "";
            existing_user.date_to = date_to ? date_to : "";
            existing_user.branch = branch && branch;
            existing_user.total = total_amount;
            existing_user.tax_amount = tax_amount;
            existing_user.grand_total =
              parseFloat(total_amount) + parseFloat(tax_amount);
            existing_user.quotation_status = "Pending";
            existing_user.status = status ? status : 0;

            const dataToUpdate = await existing_user.save();

            const delteDetails = await quotation_details.deleteMany({
              quotation_id: id,
            });

            for (const value of details) {
              const item = await items.findById(value?.id);

              if (item) {
                const quoteDetails = new quotation_details({
                  quotation_id: id,
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

                const detailsToSave = await quoteDetails.save();
              } else {
                failed_400(res, "Item not found");
              }
            }
            success_200(res, "Quotation Updated");
          }
        } else {
          failed_400(res, "Quotation not found");
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_quotation = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const { id } = req?.params;
      const quotation = await quotations
        ?.findById(id)
        .populate("customer")
        .populate({ path: "created_by", select: "-password" });
      if (quotation) {
        const quotation_detail = await quotation_details?.find({
          quotation_id: id,
        });

        const get_customer = await customers?.find({
          branch: authorize?.branch,
        });
        const get_items = await items?.find({ branch: authorize?.branch });

        const data = {
          quotation,
          quotation_detail,
          customers: get_customer,
          items: get_items,
        };
        success_200(res, "", data);
      } else {
        failed_400(res, "Quotation not found");
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_quotation = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const quotation = await quotations
        ?.find({
          branch: authorize?.branch,
        })
        .populate("customer");
      if (quotation) {
        success_200(res, "", quotation);
      } else {
        failed_400(res, "Quotation not found");
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  get_create_quotation,
  create_quotation,
  update_quotation,
  get_quotation,
  get_all_quotation,
};
