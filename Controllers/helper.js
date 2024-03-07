const {
  catch_400,
  incomplete_400,
  unauthorized,
  success_200,
  failed_400,
} = require("../Global/errors");
const items = require("../Models/items");
const { findById } = require("../Models/modules");

const get_brands = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { name, category, products } = req?.body;

      if (!name || !category || !products) {
        incomplete_400(res);
      } else {
        const allBrands = await items?.find({ ref: authorize?.ref });

        success_200(res, "", allBrands);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(errors?.message);
  }
};

const get_brands_id = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id, name, category, products } = req?.body;

      if (!id || !name || !category || !products) {
        incomplete_400(res);
      } else {
        const getBrand = await items?.findById(id);

        if (getBrand) {
          success_200(res, "", getBrand);
        } else {
          failed_400(res, "Brand not found");
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(errors?.message);
  }
};

const create_brands = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { name, category, products } = req?.body;

      if (!name || !category || products?.length <= 0) {
        incomplete_400(res);
      } else {
        const brandsData = new items({
          name: name,
          category: category,
        });
        const brand = await brandsData?.save();

        for (products of value) {
          const brands_details = new item_details({
            brand_id: brand?._id,
            product_id: value?.product_id,
            name: value?.name,
          });
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(errors?.message);
  }
};

module.exports = { get_brands, get_brands_id, create_brands };
