require("dotenv").config();
const { authorization } = require("../Global/authorization.js");
const {
  catch_400,
  incomplete_400,
  success_200,
  failed_400,
  unauthorized,
} = require("../Global/errors");
const branches = require("../Models/branches");
const users = require("../Models/users");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const users_log = require("../Models/users_log");
const nodeMailer = require("nodemailer");
const { environment } = require("../Global/environment.js");
const roles = require("../Models/roles.js");
const roles_details = require("../Models/roles_details.js");

const Environment = environment();

const SECRET_KEY =
  Environment === "PRODUCTION"
    ? process.env.PRODUCTION_SECRET_KEY
    : Environment === "TESTING"
    ? process.env.TESTING_SECRET_KEY
    : Environment === "DEVELOPMENT"
    ? process.env.DEVELOPMENT_SECRET_KEY
    : Environment === "LOCAL"
    ? process.env.LOCAL_SECRET_KEY
    : "";

const generate_otp = async (res) => {
  try {
    let otp = await Math.floor(1000 + Math.random() * 9000);
    let hashed_otp = await bcrypt.hash(otp.toString(), 10);

    let data = {
      otp: otp,
      hashed_otp: hashed_otp,
    };

    return data;
  } catch (errors) {
    catch_400(res, errors?.messages);
  }
};

const send_email = async (res, email) => {
  try {
    const transporter = nodeMailer.createTransport({
      host: "smtp.hostinger.com",
      port: 465,
      secure: true,
      auth: {
        user: "masirat@masirat.com",
        pass: "Nun@9000",
      },
      authMethod: "LOGIN",
    });

    const mailOptions = {
      from: "masirat@masirat.com",
      to: email.to,
      subject: email.subject,
      html: email.message,
    };

    await transporter.sendMail(mailOptions);
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const send_otp = async (req, res) => {
  try {
    const { user, email } = req?.body;

    if (!user || !email) {
      incomplete_400(res);
    } else {
      const get_otp = await generate_otp(res);

      const otp = get_otp?.otp;
      const hashed_otp = get_otp?.hashed_otp;

      const message = `<div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #333;">Your OTP Code for Manageconstructs Verification</h2>
          <p>Dear ${user},</p>
          <p>To ensure the security of your Manageconstructs account, please use the One-Time Password (OTP) provided below:</p>
          <p style="font-size: 1.5em; font-weight: bold; color: #0066cc;">Your OTP Code: ${otp}</p>
          <p>This code is valid for the next 2 minutes and can only be used once.</p>
          <p>If you did not request this OTP, please ignore this email or contact our support team immediately.</p>
          <p>Thank you for using Manageconstructs.</p>
          <p>Best regards,<br>
          Masirat Technology</p>
      </div>`;

      await send_email(res, {
        to: email,
        subject: "OTP for Manageconstructs Account Verification",
        message: message,
      });

      success_200(res, "OTP Sent", hashed_otp);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_next_ref = async (req, res, number) => {
  try {
    const total_user = await users.countDocuments({
      role: "SUPERADMIN",
    });

    const next_user_number = number + total_user;

    const existing_user_number = await users.findOne({
      ref: next_user_number,
      role: "SUPERADMIN",
    });

    if (existing_user_number) {
      return await get_next_ref(req, res, next_user_number);
    } else {
      return next_user_number;
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const signup = async (req, res) => {
  try {
    const { name, phone, email, password, company, country } = req?.body;

    let new_number = await get_next_ref(req, res, 1000);
    let assigned_number = new_number;

    const existing_ref = await users?.findOne({ ref: assigned_number });

    if (existing_ref) {
      failed_400(res, "Reference number exists");
    } else {
      if (
        !name ||
        !phone ||
        !email ||
        !password ||
        !company ||
        !country ||
        !assigned_number
      ) {
        incomplete_400(res);
      } else {
        const existing_email = await users.findOne({ email: email });

        if (existing_email) {
          failed_400(res, "Email already exists");
        } else {
          const hashed_password = await bcrypt.hash(password, 10);

          const branch = new branches({
            name: company,
            phone: phone,
            email: email,
            country: country,
            status: 403,
            billing: 0,
            ref: assigned_number,
            created: new Date(),
          });
          const branch_save = await branch?.save();

          const user = new users({
            name: name,
            phone: phone,
            email: email,
            password: hashed_password,
            role: "SUPERADMIN",
            status: 1,
            ref: assigned_number,
            branch: branch_save?._id,
            created: new Date(),
          });
          const user_save = await user.save();
          success_200(res, "Account created");
        }
      }
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const signin = async (req, res) => {
  try {
    const { email, password } = req?.body;

    if (!email || !password) {
      incomplete_400(res);
    } else {
      const user = await users?.findOne({ email: email });
      const branch = await branches?.findById(user?.branch);

      if (!user || user?.status == 2) {
        failed_400(res, "Invalid email or password");
      } else if (!user?.status || branch?.status == 403) {
        failed_400(res, "Account inactive");
      } else {
        const verify_password = await bcrypt.compare(password, user.password);

        if (!verify_password) {
          failed_400(res, "Invalid email or password");
        } else {
          const user_log = new users_log({
            user: user?._id,
            image: user?.image,
            name: user?.name,
            phone: user?.phone,
            email: user?.email,
            password: user?.password,
            role: user?.role,
            branches: user?.branches,
            status: user?.status,
            ref: user?.ref,
            branch: user?.branch,
            login: new Date(),
            logout: user?.logout,
            updated: new Date(),
            updated_by: user?._id,
          });
          const user_log_save = await user_log?.save();

          user.login = new Date();
          const user_update = await user?.save();

          const token = jwt.sign(
            {
              id: user._id,
              name: user.name,
              phone: user.phone,
              email: user.email,
              role: user.role,
              status: user.status,
              ref: user.ref,
              branch: user.branch,
            },
            SECRET_KEY
          );

          const data = {
            token: token,
          };

          success_200(res, "Login", data);
        }
      }
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const signout = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const selected_user = await users?.findById(authorize?.id);

      if (!selected_user) {
        failed_400(res, "User not found");
      } else {
        const user_log = new users_log({
          user: selected_user?._id,
          image: selected_user?.image,
          name: selected_user?.name,
          phone: selected_user?.phone,
          email: selected_user?.email,
          password: selected_user?.password,
          role: selected_user?.role,
          status: selected_user?.status,
          ref: selected_user?.ref,
          branch: selected_user?.branch,
          login: selected_user?.login,
          logout: new Date(),
          updated: new Date(),
          updated_by: authorize?.id,
        });
        const user_log_save = await user_log?.save();

        selected_user.logout = new Date();
        const user_update = await selected_user?.save();

        success_200(res, "Logout");
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const create_user = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { name, phone, email, branches, role, password, status, branch } =
        req.body;

      if (!name || !phone || !email || !password || !role || !branches) {
        incomplete_400(res);
      } else {
        const selected_user_email = await users.findOne({ email: email });

        if (selected_user_email) {
          failed_400(res, "User email exists");
        } else {
          const hashed_password = await bcrypt.hash(password, 10);

          const user = new users({
            name: name,
            phone: phone,
            email: email,
            password: hashed_password,
            branches: branches,
            role: role,
            status: status ? status : 0,
            // branch: branch ? branch : authorize?.branch,
            branch: branches,
            ref: authorize?.ref,
            branch: authorize.branch,
            created: new Date(),
            created_by: authorize?.id,
          });
          await user.save();
          success_200(res, "User created");
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors.message);
  }
};

const update_user = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const {
        id,
        name,
        phone,
        email,
        branches,
        role,
        password,
        status,
        branch,
      } = req?.body;
      if (!id || !name || !email || !phone || !branches || !role) {
        incomplete_400(res);
      } else {
        const selected_user = await users?.findById(id);

        if (!selected_user || selected_user.status == 2) {
          failed_400(res, "User not found");
        } else {
          const selected_user_email = await users?.findOne({
            _id: { $ne: id },
            email: email,
          });

          if (selected_user_email) {
            failed_400(res, "User email exists");
          } else {
            const user_log = new users_log({
              user: selected_user?._id,
              name: selected_user?.name,
              phone: selected_user?.phone,
              email: selected_user?.email,
              password: selected_user?.password,
              // branches: selected_user?.branches,
              role: selected_user?.role,
              status: selected_user?.status,
              ref: selected_user?.ref,
              branch: selected_user?.branch,
              updated: new Date(),
              updated_by: authorize?.id,
            });
            const user_log_save = await user_log?.save();

            const hashed_password = await bcrypt.hash(password, 10);

            selected_user.name = name;
            selected_user.phone = phone;
            selected_user.email = email;
            selected_user.password = hashed_password;
            // selected_user.branches = branches;
            selected_user.role = role;
            selected_user.status = status ? status : 0;
            // selected_user.branch = branch ? branch : authorize?.branch;
            selected_user.branch = branches;

            const user_update = await selected_user?.save();
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

const update_user_auth = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { password } = req?.body;

      if (!password) {
        incomplete_400(res);
      } else {
        const selected_user = await users?.findById(authorize?.id);

        if (!selected_user || selected_user.status == 2) {
          failed_400(res, "User not found");
        } else {
          const user_log = new users_log({
            user: selected_user?._id,
            image: selected_user?.image,
            name: selected_user?.name,
            phone: selected_user?.phone,
            email: selected_user?.email,
            password: selected_user?.password,
            branches: selected_user?.branches,
            role: selected_user?.role,
            status: selected_user?.status,
            ref: selected_user?.ref,
            branch: selected_user?.branch,
            updated: new Date(),
            updated_by: authorize?.id,
          });
          const user_log_save = await user_log?.save();

          const hashed_password = await bcrypt.hash(password, 10);

          selected_user.password = hashed_password;
          const user_update = await selected_user?.save();
          success_200(res, "User auth updated");
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const delete_user = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;
      if (!id) {
        incomplete_400(res);
      } else {
        const selected_user = await users?.findById(id);

        if (
          !selected_user ||
          selected_user.role != "SUPERADMIN" ||
          selected_user.status == 2
        ) {
          failed_400(res, "User not found");
        } else {
          const user_log = new users_log({
            image: selected_user?.image,
            user: selected_user?._id,
            name: selected_user?.name,
            phone: selected_user?.phone,
            email: selected_user?.email,
            password: selected_user?.password,
            role: selected_user?.role,
            branches: selected_user?.branches,
            status: selected_user?.status,
            ref: selected_user?.ref,
            branch: selected_user?.branch,
            updated: new Date(),
            updated_by: authorize?.id,
          });
          const user_log_save = await user_log?.save();

          selected_user.status = 2;
          const user_delete = await selected_user?.save();
          success_200(res, "User deleted");
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
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_user = await users
          ?.findById(id)
          ?.select("-password")
          ?.populate({ path: "branch" });

        if (!selected_user || selected_user.status == 2) {
          failed_400(res, "User not found");
        } else {
          let user = selected_user?.toObject();
          let role = await roles?.findById(user?.role);

          let user_detail = {
            ...user,
            role: role,
          };

          success_200(res, "", user_detail);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_user_auth = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const selected_user = await users
        ?.findById(authorize?.id)
        ?.select("-password")
        ?.populate({ path: "branch" });

      if (!selected_user || selected_user.status == 2) {
        failed_400(res, "User not found");
      } else {
        let user = selected_user?.toObject();

        let user_detail = {};

        if (selected_user?.role == "SUPERADMIN") {
          user_detail = {
            ...user,
          };
        } else {
          let user_role = await roles?.findById(selected_user?.role);
          let user_role_details = await roles_details?.find({
            role: user_role?._id,
          });

          let role = {
            ...user_role?.toObject(),
            details: user_role_details,
          };

          user_detail = {
            ...user,
            role: role,
          };
        }

        success_200(res, "", user_detail);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_users = async (req, res) => {
  try {
    // Authorization check
    const authorize = authorization(req);
    if (!authorize) return unauthorized(res);

    const all_users = await users
      ?.find({
        ref: authorize?.ref,
        role: { $ne: "SUPERADMIN" },
      })
      .select("-password");

    if (!all_users || all_users.length === 0) {
      return success_200(res, "No users found", []);
    }

    const userRoles = await roles?.find({
      _id: { $in: all_users.map((user) => user.role) },
    });

    const roleMap = userRoles?.reduce((map, role) => {
      map[role._id] = role;
      return map;
    }, {});

    const all_user_details = all_users.map((user) => {
      const user_role = roleMap[user.role];
      return {
        ...user.toObject(),
        role: user_role || null,
      };
    });

    success_200(res, "", all_user_details);
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_user_log = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_user_log = await users_log
          ?.findById(id)
          ?.select("-password");

        if (!selected_user_log) {
          failed_400(res, "User log not found");
        } else {
          success_200(res, "", selected_user_log);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_users_logs = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { user } = req?.body;

      if (!user) {
        incomplete_400(res);
      } else {
        const all_user_logs = await users_log
          ?.find({ user: user })
          ?.select("-password");
        success_200(res, "", all_user_logs);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  signup,
  send_otp,
  signin,
  signout,
  create_user,
  update_user,
  update_user_auth,
  delete_user,
  get_user,
  get_user_auth,
  get_all_users,
  get_user_log,
  get_all_users_logs,
};
