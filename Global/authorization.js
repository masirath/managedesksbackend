require("dotenv").config();
const jwt = require("jsonwebtoken");
const { environment } = require("./environment");
const users = require("../Models/users");
const roles_details = require("../Models/roles_details");
const roles = require("../Models/roles");

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

const authorization = (req) => {
  try {
    const authorizationHeader = req.headers["authorization"];

    if (!authorizationHeader) {
      return null;
    }

    const token = authorizationHeader.split(" ")[1];

    const decodedToken = jwt.verify(token, SECRET_KEY);
    return decodedToken;
  } catch (error) {
    return null;
  }
};

const user_authorization = async (authorize, module, type) => {
  try {
    const user = await users?.findById(authorize?.id)?.select("-password");

    let user_authentication = 0;

    if (user?.role == "SUPERADMIN") {
      user_authentication = 1;
    } else {
      let user_role = await roles?.findById(user?.role);
      let user_role_details = await roles_details?.find({
        role: user_role?._id,
      });

      for (value of user_role_details) {
        if (value?.name == module && value?.[type]) {
          user_authentication = 1;
        }
      }
    }

    return user_authentication;
  } catch (error) {
    return null;
  }
};

module.exports = {
  authorization,
  user_authorization,
};
