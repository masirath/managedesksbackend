
const purchase_orders = require("../../../managedesksbackend/Models/purchase_orders");
const purchase_orders_details = require("../../../managedesksbackend/Models/purchase_orders_details");
const { success_200, failed_400, catch_400 } = require("../../Global/responseHandlers");
const {authorization} = require("../../Global/authorization")

const get_purchase_order_with_delivered_items = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_purchase_order = await purchase_orders.findById(id)
          .populate("supplier")
          .populate("branch");

        if (!selected_purchase_order || selected_purchase_order.status == 2) {
          failed_400(res, "Purchase Order not found");
        } else {
          const selected_purchase_order_details = await purchase_orders_details.find({
            purchase: selected_purchase_order._id,
            delivery_status: 2,  // only delivered items
          })
          .populate({
            path: "description",
            match: { status: { $ne: 2 } }, // if you need active items only
          });

          const purchaseData = selected_purchase_order.toObject();

          success_200(res, "", {
            ...purchaseData,
            delivered_items: selected_purchase_order_details,
          });
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors.message);
  }
};

module.exports = { get_purchase_order_with_delivered_items };
