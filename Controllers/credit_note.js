const { authorization } = require("../Global/authorization");
const {
  catch_400,
  unauthorized,
  incomplete_400,
  success_200,
  failed_400,
} = require("../Global/errors");
const credit_note = require("../Models/credit_note");

const create_credit_note = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const {
        issue_date,
        description,
        customer_suppliers,
        note,
        reason,
        amount,
      } = req?.body;

      if (
        !issue_date ||
        !description ||
        !customer_suppliers ||
        !note ||
        !reason ||
        !amount
      ) {
        incomplete_400(res);
      } else {
        const data = new credit_note({
          issue_date: issue_date,
          description: description,
          customer_suppliers: customer_suppliers,
          note: note,
          reason: reason,
          amount: amount,
          ref: authorize?.ref,
          branch: authorize?.branch,
          created: new Date(),
          updated: new Date(),
          created_by: authorize?.id,
        });

        const dataToSave = await data?.save();
        success_200(res, "Credit note saved", dataToSave);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const update_credit_note = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const {
        id,
        issue_date,
        description,
        customer_suppliers,
        note,
        reason,
        amount,
      } = req?.body;

      if (
        !id ||
        !issue_date ||
        !description ||
        !customer_suppliers ||
        !note ||
        !reason ||
        !amount
      ) {
        incomplete_400(res);
      } else {
        const selected_credit_note = await credit_note?.findById(id);

        if (!selected_credit_note) {
          failed_400(res, "Credit note not found");
        } else {
          selected_credit_note.issue_date = issue_date;
          selected_credit_note.description = description;
          selected_credit_note.customer_suppliers = customer_suppliers;
          selected_credit_note.note = note;
          selected_credit_note.reason = reason;
          selected_credit_note.amount = amount;
          selected_credit_note.updated = new Date();

          const dataToUpdate = await selected_credit_note?.save();
          success_200(res, "Credit note updated", dataToUpdate);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_credit_note = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const { id } = req?.params;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_credit_note = await credit_note?.findById(id);

        if (!selected_credit_note) {
          failed_400(res, "Credit note not found");
        } else {
          success_200(res, "", selected_credit_note);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_credit_note = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const all_credit_note = await credit_note?.find({
        branch: authorize?.branch,
      });
      success_200(res, "", all_credit_note);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_credit_note,
  update_credit_note,
  get_credit_note,
  get_all_credit_note,
};
