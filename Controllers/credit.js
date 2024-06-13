const { authorization } = require("../Global/authorization");
const {
  catch_400,
  unauthorized,
  incomplete_400,
  success_200,
  failed_400,
} = require("../Global/errors");
const credit = require("../Models/credit");

const create_credit = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const { transaction_date, description, account, amount } = req?.body;

      if (!transaction_date || !description || !account || !amount) {
        incomplete_400(res);
      } else {
        const data = new credit({
          transaction_date: transaction_date,
          description: description,
          account: account,
          amount: amount,
          ref: authorize?.ref,
          branch: authorize?.branch,
          created: new Date(),
          updated: new Date(),
          created_by: authorize?.id,
        });

        const dataToSave = await data?.save();
        success_200(res, "", dataToSave);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const update_credit = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const { id, transaction_date, description, account, amount } = req?.body;

      if (!id || !transaction_date || !description || !account || !amount) {
        incomplete_400(res);
      } else {
        const selected_credit = await credit?.findById(id);

        if (!selected_credit) {
          failed_400(res, "Credit not found");
        } else {
          selected_credit.transaction_date = transaction_date;
          selected_credit.description = description;
          selected_credit.account = account;
          selected_credit.amount = amount;
          selected_credit.updated = new Date();

          const dataToUpdate = await selected_credit?.save();
          success_200(res, "Credit updated", dataToUpdate);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_credit = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const { id } = req?.params;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_credit = await credit?.findById(id);

        if (!selected_credit) {
          failed_400(res, "Credit not found");
        } else {
          success_200(res, "", selected_credit);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_credit = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const all_credit = await credit?.find({ branch: authorize?.branch });
      success_200(res, "", all_credit);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = { create_credit, update_credit, get_credit, get_all_credit };
