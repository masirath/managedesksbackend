const users = require("../Models/users");
const branch = require("../Models/branch");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const secret_key = process.env.SECRET_KEY;
const {
  catch_400,
  failed_400,
  success_200,
  incomplete_400,
  unauthorized,
  unique_400,
} = require("../Global/errors");
const { authorization } = require("../Global/authorization");

const create_account = async (req, res) => {
  try {
    const { username, password, name, phone, email, country } = req?.body;

    if (!username || !password || !name || !phone || !email || !country) {
      incomplete_400(res);
    }

    const existing_user = await users.findOne({ username: username });
    if (existing_user) {
      unique_400(res, 401, "Username already exists");
    }

    const hashed_password = await bcrypt.hash(password, 10);

    const total_user = await users.countDocuments({ role: "SUPERADMIN" });
    const next_ref = "REF-" + (1000 + total_user);

    const branchData = new branch({
      name: name,
      email: email,
      phone: phone,
      country: country,
      ref: next_ref,
    });

    const branchToSave = await branchData.save();

    const usersData = new users({
      username: username,
      password: hashed_password,
      first_name: username,
      email: email,
      phone: phone,
      role: "SUPERADMIN",
      ref: next_ref,
      branch: branchData?._id,
    });

    const usersToSave = await usersData.save();

    const dataToSave = {
      user: usersToSave,
      branch: branchToSave,
    };

    success_200(res, "Account created", dataToSave);
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const create_user = async (req, res) => {
  try {
    const authorize = authorization(req, res);

    if (authorize) {
      const {
        username,
        password,
        first_name,
        last_name,
        reference_no,
        email,
        phone,
        role,
        branch,
        status,
      } = req?.body;

      if (!username || !password || !first_name || !role || !branch) {
        incomplete_400(res);
      }

      const existing_username = await users.findOne({
        username: username,
      });

      const existing_reference = await users.findOne({
        reference_no: reference_no,
      });

      if (existing_username) {
        unique_400(res, 401, "Username already exists");
      }

      if (existing_reference) {
        unique_400(res, 402, "Reference number already exists");
      }

      const hashed_password = await bcrypt.hash(password, 10);

      const data = new users({
        username: username,
        password: hashed_password,
        first_name: first_name,
        last_name: last_name,
        reference_no: reference_no,
        email: email,
        phone: phone,
        role: role,
        ref: authorize?.ref,
        branch: branch,
        status: status,
      });

      const dataToSave = await data.save();
      success_200(res, "User created", dataToSave);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const update_user = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const {
        id,
        username,
        password,
        first_name,
        last_name,
        reference_no,
        email,
        phone,
        role,
        branch,
        status,
      } = req?.body;

      if (!id || !username || !password || !first_name || !role || !branch) {
        incomplete_400(res);
      }

      const update_user = await users.findById(id);

      if (!update_user) {
        failed_400(res, "User not found");
      }

      const existing_username = await users.findOne({
        username: username,
        _id: { $ne: id },
      });

      const existing_reference = await users.findOne({
        reference_no: reference_no,
        _id: { $ne: id },
      });

      if (existing_username) {
        unique_400(res, 401, "Username already exists");
      }

      if (existing_reference) {
        unique_400(res, 402, "Reference number already exists");
      }

      username && (update_user.username = username);
      first_name && (update_user.first_name = first_name);
      last_name && (update_user.last_name = last_name);
      reference_no && (update_user.reference_no = reference_no);
      email && (update_user.email = email);
      phone && (update_user.phone = phone);
      role && (update_user.role = role);
      branch && (update_user.branch = branch);
      status && (update_user.status = status);

      if (password) {
        const hashed_password = await bcrypt.hash(password, 10);
        update_user.password = hashed_password;
      }

      const dataToSave = await update_user.save();
      success_200(res, "User updated", dataToSave);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const user_status = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const { id, status } = req.body;

      if (!id || !status) {
        incomplete_400(status);
      }

      const update_user = await users.findById(id);

      if (!update_user) {
        failed_400(res, "User not found");
      }

      status && (update_user.status = status);

      const dataToSave = await update_user.save();
      success_200(res, "User status updated", dataToSave);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res);
  }
};

const verify_user = async (req, res) => {
  try {
    const { username, password } = req?.body;

    if (!username || !password) {
      incomplete_400(res);
    }

    const user = await users.findOne({ username: username });

    if (!user) {
      unique_400(res, 401, "Invalid username or password");
    }

    if (!user.status) {
      unique_400(res, 402, "Invalid account");
    }

    const verify_password = await bcrypt.compare(password, user.password);

    if (verify_password) {
      const token = jwt.sign(
        {
          id: user._id,
          username: user.username,
          role: user.role,
          branch: user.branch,
          ref: user.ref,
        },
        secret_key
      );

      const data = {
        token: token,
      };
      success_200(res, "Login successfully", data);
    } else {
      failed_400(res, "Invalid username or password");
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_account,
  create_user,
  update_user,
  user_status,
  verify_user,
};
