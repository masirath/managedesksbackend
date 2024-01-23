const purchases = require("../Models/purchases");
const { authorization } = require("../Global/authorization");
const {
  catch_400,
  unauthorized,
  incomplete_400,
  failed_400,
} = require("../Global/errors");
const { find } = require("../Models/suppliers");

const get_create_purchase = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const get_customers = await customers.find({ branch: authorize?.branch });
      const get_items = await items.find({ branch: authorize?.branch });
      const quote_number = await get_next_quotation(req, res, 1000);

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

const create_purchase = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const {
        purchase_order_number,
        supplier,
        date,
        total,
        tax_amount,
        grand_total,
        purchase_status,
        payment_status,
        paid_amount,
        status,
        branch,
      } = req?.body;

      if (
        !purchase_order_number ||
        !supplier ||
        !date ||
        !total ||
        !tax_amount ||
        !grand_total ||
        !purchase_status
      ) {
        incomplete_400(res);
      } else {
        const existing_purchase = await find({
          purchase_order_number: purchase_order_number,
        });

        if (existing_purchase) {
          failed_400(res, "Purchase Number exists");
        } else {
          const purchase = new purchases({
            purchase_order_number: purchase_order_number,
            supplier: supplier,
            date: date,
            total: total,
            tax_amount: tax_amount,
            grand_total: grand_total,
            purchase_status: purchase_status,
            payment_status: payment_status,
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
          } else {
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

module.exports = { create_purchase };
