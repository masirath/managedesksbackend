const {
  catch_400,
  incomplete_400,
  success_200,
  failed_400,
} = require("../Global/errors");
const website = require("../Models/website");

const create_website_quote = async (req, res) => {
  try {
    const { name, email, company, phone, requirement } = req?.body;
    if (!name || !email || !company || !phone || !requirement) {
      incomplete_400(res);
    } else {
      const quote = new website({
        name: name,
        email: email,
        company: company,
        phone: phone,
        requirement: requirement,
        date: new Date(),
      });

      const websiteQuote = await quote.save();
      if (websiteQuote) {
        success_200(res, "Your message was sent successfully");
      } else {
        failed_400(res, "Failed to send message");
      }
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = { create_website_quote };
