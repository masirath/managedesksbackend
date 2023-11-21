const enquiry = require("../Models/enquiry");
const {
  catch_400,
  failed_400,
  success_200,
  incomplete_400,
} = require("../Global/errors");

const create_enquiry = async (req, res) => {
  try {
    const { name, email, phone, service, message } = req?.body;

    if (!name || !email || !phone) {
      incomplete_400(res);
    }

    const data = new enquiry({
      name: name,
      email: email,
      phone: phone,
      service: service,
      message: message,
    });

    const dataToSave = await data.save();
    success_200(res, "Hey, We will connect with you soon");
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_enquiry = async (req, res) => {
  try {
    const data = await enquiry.find();
    success_200(res, "", data);
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_enquiry,
  get_enquiry,
};
