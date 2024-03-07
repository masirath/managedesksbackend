const { authorization } = require("../Global/authorization");
const { catch_400, unauthorized, success_200 } = require("../Global/errors");
const country = require("../Models/country");
const flags = require("country-flags-svg");
const industry = require("../Models/industry");

const get_country_data = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const { search } = req?.body;

      let countries;
      if (search) {
        countries = await country
          .find({
            country: { $regex: search, $options: "i" },
          })
          .sort({ name: 1 })
          .limit(10);
      } else {
        // countries = await country.find().sort({ country: 1 }).limit(10);
        countries = await country.find().sort({ country: 1 });
      }

      success_200(res, "", countries);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_industry_data = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const { search } = req?.body;

      let industries;
      if (search) {
        industries = await industry
          .find({
            name: { $regex: search, $options: "i" },
          })
          .sort({ name: 1 })
          .limit(10);
      } else {
        // industries = await industry.find().sort({ name: 1 }).limit(10);
        industries = await industry.find().sort({ name: 1 });
      }

      success_200(res, "", industries);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = { get_country_data, get_industry_data };
