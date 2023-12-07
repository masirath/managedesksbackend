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
  error_400,
} = require("../Global/errors");
const { authorization } = require("../Global/authorization");

const create_account = async (req, res) => {
  try {
    const { username, password, name, phone, email, country } = req?.body;

    if (!username || !password || !name || !phone || !email || !country) {
      incomplete_400(res);
    } else {
      const existing_user = await users.findOne({ username: username });

      if (existing_user) {
        error_400(res, 401, "Username already exists");
      } else {
        const hashed_password = await bcrypt.hash(password, 10);

        const total_user = await users.countDocuments({ role: "SUPERADMIN" });
        const next_ref = "REF-" + (1000 + total_user);

        const branchData = new branch({
          name: name,
          email: email,
          phone: phone,
          country: country,
          ref: next_ref,
          created: new Date(),
          updated: new Date(),
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
          created: new Date(),
          updated: new Date(),
        });

        const usersToSave = await usersData.save();

        const dataToSave = {
          user: usersToSave,
          branch: branchToSave,
        };

        success_200(res, "Account created");
      }
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const create_user = async (req, res) => {
  try {
    const authorize = authorization(req);

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
        status,
        branch,
      } = req?.body;

      if (!username || !password || !first_name || !role) {
        incomplete_400(res);
      } else {
        const existing_username = await users.findOne({
          username: username,
        });

        const existing_reference = await users.findOne({
          reference_no: { $ne: "", $eq: reference_no },
          branch: authorize?.branch,
        });

        if (existing_username) {
          error_400(res, 401, "Username already exists");
        } else if (existing_reference) {
          error_400(res, 402, "Reference number already exists");
        } else {
          const hashed_password = await bcrypt.hash(password, 10);

          const data = new users({
            username: username,
            password: hashed_password,
            first_name: first_name,
            last_name: last_name,
            reference_no: reference_no,
            email: email,
            phone: phone,
            status: status ? status : 0,
            role: role,
            ref: authorize?.ref,
            branch: authorize?.branch,
            created: new Date(),
            updated: new Date(),
            created_by: authorize?.id,
          });

          const dataToSave = await data.save();
          success_200(res, "User created");
        }
      }
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
        status,
        branch,
      } = req?.body;

      if (!id || !username || !first_name || !role) {
        incomplete_400(res);
      } else {
        const user = await users.findById(id);

        if (!user) {
          failed_400(res, "User not found");
        } else {
          const existing_username = await users.findOne({
            username: username,
            _id: { $ne: id },
          });

          const existing_reference = await users.findOne({
            reference_no: { $ne: "", $eq: reference_no },
            _id: { $ne: id },
            branch: authorize?.branch,
          });

          if (existing_username) {
            error_400(res, 401, "Username already exists");
          } else if (existing_reference) {
            error_400(res, 402, "Reference number already exists");
          } else {
            username && (user.username = username);
            first_name && (user.first_name = first_name);
            last_name && (user.last_name = last_name);
            reference_no && (user.reference_no = reference_no);
            email && (user.email = email);
            phone && (user.phone = phone);
            role && (user.role = role);
            branch && (user.branch = branch);
            status ? (user.status = status) : (user.status = 0);
            user.updated = new Date();

            if (password) {
              const hashed_password = await bcrypt.hash(password, 10);
              user.password = hashed_password;
            }

            const dataToUpdate = await user.save();
            success_200(res, "User updated");
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

const get_user = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const { id } = req?.params;

      if (!id) {
        incomplete_400(res);
      }

      let user = await users
        .findById(id)
        .select("-password")
        .populate("branch");

      if (!user) {
        failed_400(res, "User not found");
      } else {
        success_200(res, "", user);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_user = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      let usersList = await users
        .find({
          branch: authorize?.branch,
          role: { $ne: "SUPERADMIN" },
        })
        .select("-password");

      success_200(res, "", usersList);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
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
      error_400(res, 401, "Invalid username or password");
    }

    if (!user.status) {
      error_400(res, 402, "Invalid account");
    }

    const verify_password = await bcrypt.compare(password, user.password);

    if (verify_password) {
      const user_branch = await branch.findById(user.branch);

      const token = jwt.sign(
        {
          id: user._id,
          username: user.username,
          role: user.role,
          branch: user_branch,
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
  get_user,
  get_all_user,
  verify_user,
};
