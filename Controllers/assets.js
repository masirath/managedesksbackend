const { authorization } = require("../Global/authorization");
const {
  catch_400,
  unauthorized,
  incomplete_400,
  success_200,
} = require("../Global/errors");
const assets = require("../Models/assets");

const create_asset = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const { asset, asset_type, purchase_date, purchase_amount, serial_id } =
        req?.body;

      if (
        !asset ||
        !asset_type ||
        !purchase_date ||
        !purchase_amount ||
        !serial_id
      ) {
        incomplete_400(res);
      } else {
        const data = new assets({
          asset: asset,
          asset_type: asset_type,
          purchase_date: purchase_date,
          purchase_amount: purchase_amount,
          serial_id: serial_id,
          ref: authorize?.ref,
          branch: authorize?.branch,
          created: new Date(),
          updated: new Date(),
          created_by: authorize?.id,
        });

        const dataToSave = await data?.save();
        success_200(res, "Asset created", dataToSave);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const update_asset = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const {
        id,
        asset,
        asset_type,
        purchase_date,
        purchase_amount,
        serial_id,
      } = req?.body;

      if (
        !id ||
        !asset ||
        !asset_type ||
        !purchase_date ||
        !purchase_amount ||
        !serial_id
      ) {
        incomplete_400(res);
      } else {
        const selected_asset = await assets?.findById(id);
        if (!selected_asset) {
          failed_400(res, "Asset not found");
        } else {
          selected_asset.asset = asset;
          selected_asset.asset_type = asset_type;
          selected_asset.purchase_date = purchase_date;
          selected_asset.purchase_amount = purchase_amount;
          selected_asset.serial_id = serial_id;
          selected_asset.updated = new Date();

          const dataToUpdate = await selected_asset?.save();
          success_200(res, "Asset updated", dataToUpdate);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_asset = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      const { id } = req?.params;
      if (!id) {
        incomplete_400(res);
      } else {
        const selected_asset = await assets?.findById(id);

        if (!selected_asset) {
          failed_400(res, "Asset not found");
        } else {
          success_200(res, "", selected_asset);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_assets = async (req, res) => {
  try {
    let authorize = authorization(req);
    if (authorize) {
      let all_assets = await assets?.find({
        branch: authorize?.branch,
      });
      success_200(res, "", all_assets);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_asset,
  update_asset,
  get_asset,
  get_all_assets,
};
