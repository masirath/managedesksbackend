const items = require("../Models/items");
const { authorization } = require("../Global/authorization");
const {
  catch_400,
  unauthorized,
  incomplete_400,
  error_400,
  success_200,
  failed_400,
} = require("../Global/errors");
const branch = require("../Models/branch");
const { default: mongoose } = require("mongoose");

const create_items = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const {
        name,
        unit,
        stock,
        purchase_price,
        sale_price,
        tax,
        category,
        brand,
        image,
        status,
        branch,
      } = req?.body;

      if (!name || !unit || !purchase_price || !sale_price) {
        incomplete_400(res);
      } else {
        const data = new items({
          name: name,
          unit: unit,
          stock: stock ? stock : 0,
          purchase_price: purchase_price,
          sale_price: sale_price,
          tax: tax,
          category: category,
          brand: brand,
          image: image,
          status: status ? status : 0,
          ref: authorize?.ref,
          branch: authorize?.branch,
          created: new Date(),
          updated: new Date(),
          created_by: authorize?.id,
        });

        const existing_item = await items.findOne({
          name: name,
          branch: authorize?.branch,
        });
        if (existing_item) {
          error_400(res, 401, "Item name exists");
        } else {
          const dataToSave = await data.save();
          success_200(res, "Item Created", dataToSave);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const update_items = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const {
        id,
        name,
        unit,
        stock,
        purchase_price,
        sale_price,
        tax,
        category,
        brand,
        image,
        status,
        branch,
      } = req?.body;

      if (!id || !name || !unit || !purchase_price || !sale_price) {
        incomplete_400(res);
      } else {
        const existing_item = await items.findOne({
          _id: { $ne: id },
          name: name,
          branch: authorize?.branch,
        });
        if (existing_item) {
          error_400(res, 401, "Item name exists");
        } else {
          const item = await items.findById(id);
          if (!item) {
            failed_400(res, "Item not found");
          } else {
            name && (item.name = name);
            unit && (item.unit = unit);
            stock ? (item.stock = stock) : (item.stock = 0);
            purchase_price && (item.purchase_price = purchase_price);
            sale_price && (item.sale_price = sale_price);
            tax && (item.tax = tax);
            category && (item.category = category);
            brand && (item.brand = brand);
            image && (item.image = image);
            status ? (item.status = status) : (item.status = 0);
            branch && (item.branch = branch);

            const dataToUpdata = await item.save();
            success_200(res, "Item Created", dataToUpdata);
          }
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_item = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const { id } = req?.params;

      const item = await items?.findById(id);
      if (!item) {
        failed_400(res, "Item not found");
      } else {
        success_200(res, "", item);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_items = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const itemsList = await items?.find({ branch: authorize?.branch });
      success_200(res, "", itemsList);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = { create_items, update_items, get_item, get_all_items };
