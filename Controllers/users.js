const users = require("../Models/users");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const {
  catch_400,
  failed_400,
  success_200,
  incomplete_400,
} = require("../Global/errors");
const { otp_generator } = require("../Global/otp");

const get_otp = async (req, res) => {
  try {
    const otp = String(otp_generator());
    const hashed_otp = await bcrypt.hash(otp, 10);

    const data = {
      otp: otp,
      token: hashed_otp,
    };

    success_200(res, "Otp successfully sent", data);
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const verify_otp = async (req, res) => {
  try {
    const { otp, token } = req?.body;

    if (!token || !otp) {
      incomplete_400(res);
    }

    const valid_otp = await bcrypt.compare(req?.body?.otp, req?.body?.token);

    if (valid_otp) {
      success_200(res, "Otp is valid");
    } else {
      failed_400(res, "Otp is not valid");
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const create_user = async (req, res) => {
  try {
    const { email, password, phone } = req?.body;

    if (!email || !password || !phone) {
      incomplete_400(res);
    }

    const existing_user = await users.findOne({ email: email });
    if (existing_user) {
      failed_400(res, "Email already exists");
    }

    const existing_phone = await users.findOne({ phone: phone });
    if (existing_phone) {
      failed_400(res, "Phone number already exists");
    }

    const hashed_password = await bcrypt.hash(password, 10);

    const total_user = await users.countDocuments({ role: "SUPERADMIN" });
    const next_ref = "REF-" + (1000 + total_user);

    const data = new users({
      email: email,
      phone: phone,
      password: hashed_password,
      role: "SUPERADMIN",
      ref: next_ref,
    });

    const dataToSave = await data.save();
    success_200(res, "Your account has been created.", dataToSave);
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const verify_user = async (req, res) => {
  try {
    const { email, password } = req?.body;

    if (!email || !password) {
      incomplete_400(res);
    }

    const user = await users.findOne({ email: email });

    if (!user) {
      failed_400(res, "Invalid email or password");
    }

    const verify_password = await bcrypt.compare(password, user.password);

    if (verify_password) {
      const data = {
        token: "",
      };
      success_200(res, "Login successfully", data);
    } else {
      failed_400(res, "Invalid email or password");
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const create_people = async (req, res) => {
  try {
    const { email, password, role, ref, branch } = req?.body;

    if (!email || !password || !role || !ref || !branch) {
      incomplete_400(res);
    }

    const existing_user = await users.findOne({ email: email });
    if (existing_user) {
      failed_400(res, "Email already exists");
    }

    const hashed_password = await bcrypt.hash(password, 10);

    const data = {
      email: email,
      password: hashed_password,
      role: role,
      ref: ref,
      branch: branch,
    };

    const dataToSave = data.save();
    success_200(res, "User has been created", dataToSave);
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  get_otp,
  verify_otp,
  create_user,
  verify_user,
  create_people,
};
