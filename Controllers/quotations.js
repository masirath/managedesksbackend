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

const get_create_quotation = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const get_customers = await customers.find({ branch: authorize?.branch });
      const get_items = await items.find({ branch: authorize?.branch });

      const data = {
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
                parseFloat(item?.tax / 100) *
                parseFloat(value?.quantity);
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
            grand_total: total_amount + tax_amount,
            status: status ? status : 0,
            ref: authorize?.ref,
            branch: authorize?.branch,
            created: new Date(),
            updated: new Date(),
            created_by: authorize?.id,
          });

          const quoteToSave = await quote.save();

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

          success_200(res, "Quote Created", dataToSave);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = { get_create_quotation, create_quotation };
