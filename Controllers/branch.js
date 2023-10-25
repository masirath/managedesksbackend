const branch = require("../Models/branch");
const {
  catch_400,
  failed_400,
  success_200,
  incomplete_400,
} = require("../Global/errors");

const create_branch = async (req, res) => {
  try {
    const { name, email, phone, ref, zip, street, city, state, country } =
      req?.body;

    if (!name || !ref || !zip || !street || !city || !country) {
      return res.status(400).json(incomplete_400());
    }

    const existing_email = await branch.findOne({ email: email });
    if (existing_email) {
      return res.status(400).json(failed_400("Email already exists"));
    }

    const existing_mobile = await branch.findOne({ phone: phone });
    if (existing_mobile) {
      return res.status(400).json("Phone number already exists");
    }

    const data = new branch({
      name: name,
      email: email,
      phone: phone,
      ref: ref,
      zip: zip,
      street: street,
      city: city,
      state: state,
      country: country,
    });

    const dataToSave = await data.save();
    res.status(200).json(success_200("Branch has been created", dataToSave));
  } catch (errors) {
    res.status(400).json(catch_400(errors?.message));
  }
};

module.exports = {
  create_branch,
};
