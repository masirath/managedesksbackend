const { authorization } = require("../Global/authorization");
const {
  catch_400,
  unauthorized,
  incomplete_400,
  success_200,
  failed_400,
} = require("../Global/errors");
const closing_balance = require("../Models/closing_balance");

const create_closing_balance = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const { closing_date, account_category, balance } = req?.body;

      if (!closing_date || !account_category || !balance) {
        incomplete_400(res);
      } else {
        const data = new closing_balance({
          closing_date: closing_date,
          account_category: account_category,
          balance: balance,
          ref: authorize?.ref,
          branch: authorize?.branch,
          created: new Date(),
          updated: new Date(),
          created_by: authorize?.id,
        });

        const dataToSave = await data?.save();
        success_200(res, "Closing balance saved", dataToSave);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const update_closing_balance = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const { id, closing_date, account_category, balance } = req?.body;

      if (!id || !closing_date || !account_category || !balance) {
        incomplete_400(res);
      } else {
        const selected_closing_balance = await closing_balance?.findById(id);

        if (!selected_closing_balance) {
          failed_400(res, "Closing balance not found");
        } else {
          selected_closing_balance.closing_date = closing_date;
          selected_closing_balance.account_category = account_category;
          selected_closing_balance.balance = balance;
          selected_closing_balance.updated = new Date();

          const dataToUpdate = await selected_closing_balance.save();
          success_200(res, "Closing balance updated", dataToUpdate);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_closing_balance = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      let { id } = req?.params;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_closing_balance = await closing_balance?.findById(id);
        if (!selected_closing_balance) {
          failed_400(res, "Closing balance not found");
        } else {
          success_200(res, "", selected_closing_balance);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_closing_balance = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const all__closing_balance = await closing_balance?.find({
        branch: authorize?.branch,
      });
      success_200(res, "", all__closing_balance);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_closing_balance,
  update_closing_balance,
  get_closing_balance,
  get_all_closing_balance,
};

5, 00, 000;
