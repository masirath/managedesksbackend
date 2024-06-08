const { authorization } = require("../Global/authorization");
const {
  catch_400,
  unauthorized,
  incomplete_400,
  success_200,
  failed_400,
} = require("../Global/errors");
const cash_basic_accounting = require("../Models/cash_basic_accounting");

const create_cash_basic_accounting = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const {
        transaction_date,
        memo,
        amount,
        transaction_type,
        account,
        reference,
      } = req?.body;

      if (
        !transaction_date ||
        !memo ||
        !amount ||
        !transaction_type ||
        !account ||
        !reference
      ) {
        incomplete_400(res);
      } else {
        const data = new cash_basic_accounting({
          transaction_date: transaction_date,
          memo: memo,
          amount: amount,
          transaction_type: transaction_type,
          account: account,
          reference: reference,
          ref: authorize?.ref,
          branch: authorize?.branch,
          created: new Date(),
          updated: new Date(),
          created_by: authorize?.id,
        });

        const dataToSave = await data?.save();
        success_200(res, "Cash basic accounting created", dataToSave);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const update_cash_basic_accounting = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const {
        id,
        transaction_date,
        memo,
        amount,
        transaction_type,
        account,
        reference,
      } = req?.body;

      if (
        !id ||
        !transaction_date ||
        !memo ||
        !amount ||
        !transaction_type ||
        !account ||
        !reference
      ) {
        incomplete_400(res);
      } else {
        const selected_cash_basic_accounting =
          await cash_basic_accounting?.findById(id);
        if (!selected_cash_basic_accounting) {
          failed_400(res, "Cash basic accounting not found");
        } else {
          selected_cash_basic_accounting.transaction_date = transaction_date;
          selected_cash_basic_accounting.memo = memo;
          selected_cash_basic_accounting.amount = amount;
          selected_cash_basic_accounting.transaction_type = transaction_type;
          selected_cash_basic_accounting.account = account;
          selected_cash_basic_accounting.reference = reference;
          selected_cash_basic_accounting.updated = new Date();

          const dataToUpdate = await selected_cash_basic_accounting?.save();
          success_200(res, "Cash basic accounting updated", dataToUpdate);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_cash_basic_accounting = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const { id } = req?.params;
      if (!id) {
        incomplete_400(res);
      } else {
        const selected_cash_basic_accounting =
          await cash_basic_accounting?.findById(id);
        if (!selected_cash_basic_accounting) {
          failed_400(res, "Cash basic accounting not found");
        } else {
          success_200(res, "", selected_cash_basic_accounting);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_cash_basic_accounting = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      let all_cash_basic_accounting = await cash_basic_accounting?.find({
        branch: authorize?.branch,
      });
      success_200(res, "", all_cash_basic_accounting);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_cash_basic_accounting,
  update_cash_basic_accounting,
  get_cash_basic_accounting,
  get_all_cash_basic_accounting,
};
