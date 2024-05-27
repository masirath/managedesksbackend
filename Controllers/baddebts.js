const { authorization } = require("../Global/authorization");
const {
  catch_400,
  unauthorized,
  incomplete_400,
  success_200,
} = require("../Global/errors");
const bad_debts = require("../Models/bad_debts");

const create_bad_debts = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const {
        debtor_name,
        contact,
        debt_amount,
        debt_date,
        reason,
        approver_name,
        approval_date,
        comments,
      } = req?.body;

      if (
        !debtor_name ||
        !contact ||
        !debt_amount ||
        !debt_date ||
        !reason ||
        !approver_name ||
        !approval_date ||
        !comments
      ) {
        incomplete_400(res);
      } else {
        const data = new bad_debts({
          debtor_name: debtor_name,
          contact: contact,
          debt_amount: debt_amount,
          debt_date: debt_date,
          reason: reason,
          approver_name: approver_name,
          approval_date: approval_date,
          comments: comments,
          ref: authorize?.ref,
          branch: authorize?.branch,
          created: new Date(),
          updated: new Date(),
          created_by: authorize?.id,
        });

        const dataToSave = await data?.save();
        success_200(res, "Bad debts created", dataToSave);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const update_bad_debts = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const {
        id,
        debtor_name,
        contact,
        debt_amount,
        debt_date,
        reason,
        approver_name,
        approval_date,
        comments,
      } = req?.body;
      if (
        !id ||
        !debtor_name ||
        !contact ||
        !debt_amount ||
        !debt_date ||
        !reason ||
        !approver_name ||
        !approval_date ||
        !comments
      ) {
        incomplete_400(res);
      } else {
        const selected_bad_debts = await bad_debts?.findById(id);
        if (!selected_bad_debts) {
          failed_400(res, "Bad debts not found");
        } else {
          selected_bad_debts.id = id;
          selected_bad_debts.debtor_name = debtor_name;
          selected_bad_debts.contact = contact;
          selected_bad_debts.debt_amount = debt_amount;
          selected_bad_debts.debt_date = debt_date;
          selected_bad_debts.reason = reason;
          selected_bad_debts.approver_name = approver_name;
          selected_bad_debts.approval_date = approval_date;
          selected_bad_debts.comments = comments;
          selected_bad_debts.updated = new Date();

          const dataToUpdate = await selected_bad_debts?.save();
          success_200(res, "Bad debts updated", dataToUpdate);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_bad_debts = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const { id } = req?.params;
      if (!id) {
        incomplete_400(res);
      } else {
        const selected_bad_debts = await bad_debts?.findById(id);

        if (!selected_bad_debts) {
          failed_400(res, "Bad debts not found");
        } else {
          success_200(res, "", selected_bad_debts);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_bad_debts = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      let all_bad_debts = await bad_debts?.find({
        branch: authorize?.branch,
      });
      success_200(res, "", all_bad_debts);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_bad_debts,
  update_bad_debts,
  get_bad_debts,
  get_all_bad_debts,
};
