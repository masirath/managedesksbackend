const { authorization } = require("../Global/authorization");
const {
  catch_400,
  unauthorized,
  incomplete_400,
  success_200,
  failed_400,
} = require("../Global/errors");
const cash_flow = require("../Models/cash_flow");

const create_cash_flow = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const {
        transaction_date,
        description,
        amount,
        cash_flow_type,
        category,
        reference,
      } = req?.body;

      if (
        !transaction_date ||
        !description ||
        !amount ||
        !cash_flow_type ||
        !category ||
        !reference
      ) {
        incomplete_400(res);
      } else {
        const data = new cash_flow({
          transaction_date: transaction_date,
          description: description,
          amount: amount,
          cash_flow_type: cash_flow_type,
          category: category,
          reference: reference,
          ref: authorize?.ref,
          branch: authorize?.branch,
          created: new Date(),
          updated: new Date(),
          created_by: authorize?.id,
        });

        const dataToSave = await data?.save();
        success_200(res, "Cash flow saved", dataToSave);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const update_cash_flow = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const {
        id,
        transaction_date,
        description,
        amount,
        cash_flow_type,
        category,
        reference,
      } = req?.body;

      if (
        !id ||
        !transaction_date ||
        !description ||
        !amount ||
        !cash_flow_type ||
        !category ||
        !reference
      ) {
        incomplete_400(res);
      } else {
        const selected_cash_flow = await cash_flow?.findById(id);

        if (!selected_cash_flow) {
          failed_400(res, "Cash flow not found");
        } else {
          selected_cash_flow.transaction_date = transaction_date;
          selected_cash_flow.description = description;
          selected_cash_flow.amount = amount;
          selected_cash_flow.cash_flow_type = cash_flow_type;
          selected_cash_flow.category = category;
          selected_cash_flow.reference = reference;
          selected_cash_flow.updated = new Date();

          const dataToUpdate = await selected_cash_flow?.save();
          success_200(res, "Cash flow updated", dataToUpdate);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_cash_flow = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const { id } = req?.params;
      if (!id) {
        incomplete_400(res);
      } else {
        const selected_cash_flow = await cash_flow?.findById(id);
        if (!selected_cash_flow) {
          failed_400(res, "Cash flow not found");
        } else {
          success_200(res, "", selected_cash_flow);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_cash_flow = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const all_cash_flow = await cash_flow?.find({
        branch: authorize?.branch,
      });
      success_200(res, "", all_cash_flow);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_cash_flow,
  update_cash_flow,
  get_cash_flow,
  get_all_cash_flow,
};
