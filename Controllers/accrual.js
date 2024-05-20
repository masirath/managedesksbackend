const { authorization } = require("../Global/authorization");
const {
  catch_400,
  unauthorized,
  incomplete_400,
  success_200,
  failed_400,
} = require("../Global/errors");
const accrual = require("../Models/accrual");

const create_accrual = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const { date, description, amount, account, transaction, reference } =
        req?.body;

      if (!date || !amount) {
        incomplete_400(res);
      } else {
        const data = new accrual({
          date: date,
          description: description,
          amount: amount,
          account: account,
          transaction: transaction,
          reference: reference,
          ref: authorize?.ref,
          branch: authorize?.branch,
          created: new Date(),
          updated: new Date(),
          created_by: authorize?.id,
        });

        const dataToSave = await data?.save();
        success_200(res, "Accrual created", dataToSave);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const update_accrual = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const { id, date, description, amount, account, transaction, reference } =
        req?.body;

      if (!id || !date || !amount) {
        incomplete_400(res);
      } else {
        const slected_accrual = await accrual?.findById(id);

        if (!slected_accrual) {
          failed_400(res, "Accrual not found");
        } else {
          slected_accrual.date = date ? date : "";
          slected_accrual.description = description ? description : "";
          slected_accrual.amount = amount ? amount : "";
          slected_accrual.account = account ? account : "";
          slected_accrual.transaction = transaction ? transaction : "";
          slected_accrual.reference = reference ? reference : "";
          slected_accrual.updated = new Date();

          const dataToUpdate = await slected_accrual?.save();
          success_200(res, "Accrual updated", dataToUpdate);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_accrual = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const { id } = req?.params;

      if (!id) {
        incomplete_400(res);
      } else {
        const slected_accrual = await accrual?.findById(id);

        if (!slected_accrual) {
          failed_400(res, "Accrual not found");
        } else {
          success_200(res, "", slected_accrual);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_accrual = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      let all_accrual = await accrual?.find({ branch: authorize?.branch });
      success_200(res, "", all_accrual);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_accrual,
  update_accrual,
  get_accrual,
  get_all_accrual,
};
