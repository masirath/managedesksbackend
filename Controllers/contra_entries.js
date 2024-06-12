const { authorization } = require("../Global/authorization");
const {
  catch_400,
  unauthorized,
  incomplete_400,
  success_200,
  failed_400,
} = require("../Global/errors");
const contra_entries = require("../Models/contra_entries");

const create_contra_entries = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const {
        transation_date,
        description,
        debit_account,
        debit_amount,
        credit_account,
        credit_amount,
      } = req?.body;

      if (
        !transation_date ||
        !description ||
        !debit_account ||
        !debit_amount ||
        !credit_account ||
        !credit_amount
      ) {
        incomplete_400(res);
      } else {
        const data = new contra_entries({
          transation_date: transation_date,
          description: description,
          debit_account: debit_account,
          debit_amount: debit_amount,
          credit_account: credit_account,
          credit_amount: credit_amount,
          ref: authorize?.ref,
          branch: authorize?.branch,
          created: new Date(),
          updated: new Date(),
          created_by: authorize?.id,
        });

        const dataToSave = await data?.save();
        success_200(res, "Contra entry saved", dataToSave);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const update_contra_entries = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const {
        id,
        transation_date,
        description,
        debit_account,
        debit_amount,
        credit_account,
        credit_amount,
      } = req?.body;

      if (
        !id ||
        !transation_date ||
        !description ||
        !debit_account ||
        !debit_amount ||
        !credit_account ||
        !credit_amount
      ) {
        incomplete_400(res);
      } else {
        const selected_contra_entry = await contra_entries?.findById(id);

        if (!selected_contra_entry) {
          failed_400(res, "Contra entry not found");
        } else {
          selected_contra_entry.transation_date = transation_date;
          selected_contra_entry.description = description;
          selected_contra_entry.debit_account = debit_account;
          selected_contra_entry.debit_amount = debit_amount;
          selected_contra_entry.credit_account = credit_account;
          selected_contra_entry.credit_amount = credit_amount;
          selected_contra_entry.updated = new Date();

          const dataToUpdate = await selected_contra_entry.save();
          success_200(res, "Contra entry updated", dataToUpdate);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_contra_entries = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const { id } = req?.params;
      if (!id) {
        incomplete_400(res);
      } else {
        const selected_contra_entry = await contra_entries?.findById(id);

        if (!selected_contra_entry) {
          failed_400(res, "Contra entry not found");
        } else {
          success_200(res, "", selected_contra_entry);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_contra_entries = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const all_contra_entries = await contra_entries?.find({
        branch: authorize?.branch,
      });
      success_200(res, "", all_contra_entries);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_contra_entries,
  update_contra_entries,
  get_contra_entries,
  get_all_contra_entries,
};
