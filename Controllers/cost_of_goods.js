const { authorization } = require("../Global/authorization");
const {
  catch_400,
  unauthorized,
  incomplete_400,
  success_200,
  failed_400,
} = require("../Global/errors");
const cost_of_goods = require("../Models/cost_of_goods");

const create_cost_of_goods = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const {
        transaction_date,
        description,
        inventory_account,
        goods_sold_account,
        amount,
      } = req?.body;

      if (
        !transaction_date ||
        !description ||
        !inventory_account ||
        !goods_sold_account ||
        !amount
      ) {
        incomplete_400(res);
      } else {
        const data = new cost_of_goods({
          transaction_date: transaction_date,
          description: description,
          inventory_account: inventory_account,
          goods_sold_account: goods_sold_account,
          amount: amount,
          ref: authorize?.ref,
          branch: authorize?.branch,
          created: new Date(),
          updated: new Date(),
          created_by: authorize?.id,
        });

        const dataToSave = await data?.save();
        success_200(res, "Cost of goods saved", dataToSave);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const update_cost_of_goods = async (req, res) => {
  try {
    let authorize = authorization(req);

    if (authorize) {
      const {
        id,
        transaction_date,
        description,
        inventory_account,
        goods_sold_account,
        amount,
      } = req?.body;

      if (
        !id ||
        !transaction_date ||
        !description ||
        !inventory_account ||
        !goods_sold_account ||
        !amount
      ) {
        incomplete_400(res);
      } else {
        const selected_cost_of_goods = await cost_of_goods?.findById(id);

        if (!selected_cost_of_goods) {
          failed_400(res, "Cost of goods not found");
        } else {
          selected_cost_of_goods.transaction_date = transaction_date;
          selected_cost_of_goods.description = description;
          selected_cost_of_goods.inventory_account = inventory_account;
          selected_cost_of_goods.goods_sold_account = goods_sold_account;
          selected_cost_of_goods.amount = amount;
          selected_cost_of_goods.updated = new Date();

          const dataToUpdate = await selected_cost_of_goods?.save();
          success_200(res, "Cost of goods updated", dataToUpdate);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_cost_of_goods = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const { id } = req?.params;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_cost_of_goods = await cost_of_goods?.findById(id);

        if (!selected_cost_of_goods) {
          failed_400(res, "Cost of goods not found");
        } else {
          success_200(res, "", selected_cost_of_goods);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_cost_of_goods = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const all_cost_of_goods = await cost_of_goods?.find({
        branch: authorize?.branch,
      });
      success_200(res, "", all_cost_of_goods);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_cost_of_goods,
  update_cost_of_goods,
  get_cost_of_goods,
  get_all_cost_of_goods,
};
