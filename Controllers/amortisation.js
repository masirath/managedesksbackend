const { authorization } = require("../Global/authorization");
const {
  catch_400,
  unauthorized,
  incomplete_400,
  success_200,
} = require("../Global/errors");
const amortisation = require("../Models/amortisation");

const create_amortisation = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const { asset, cost, period, from, to } = req?.body;

      if (!asset || !cost || !period || !from || !to) {
        incomplete_400(res);
      } else {
        const data = new amortisation({
          asset: asset,
          cost: cost,
          period: period,
          from: from,
          to: to,
          ref: authorize?.ref,
          branch: authorize?.branch,
          created: new Date(),
          updated: new Date(),
          created_by: authorize?.id,
        });

        const dataToSave = await data?.save();
        success_200(res, "Amortisation created", dataToSave);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const update_amortisation = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const { id, asset, cost, period, from, to } = req?.body;

      if (!id || !asset || !cost || !period || !from || !to) {
        incomplete_400(res);
      } else {
        const selected_amortization = await amortisation?.findById(id);
        if (!selected_amortization) {
          failed_400(res, "Amortisation not found");
        } else {
          selected_amortization.asset = asset;
          selected_amortization.cost = cost;
          selected_amortization.period = period;
          selected_amortization.from = from;
          selected_amortization.to = to;
          selected_amortization.updated = new Date();

          const dataToUpdate = await selected_amortization?.save();
          success_200(res, "Amortisation updated", dataToUpdate);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_amortisation = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const { id } = req?.params;
      if (!id) {
        incomplete_400(res);
      } else {
        const selected_amortization = await amortisation?.findById(id);

        if (!selected_amortization) {
          failed_400(res, "Amortization not found");
        } else {
          success_200(res, "", selected_amortization);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_amortisation = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      let all_amortisation = await amortisation?.find({
        branch: authorize?.branch,
      });
      success_200(res, "", all_amortisation);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_amortisation,
  update_amortisation,
  get_amortisation,
  get_all_amortisation,
};
