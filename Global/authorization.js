// require("dotenv").config();
// const jwt = require("jsonwebtoken");
// const { environment } = require("./environment");

// const Environment = environment();

// const SECRET_KEY =
//   Environment === "PRODUCTION"
//     ? process.env.PRODUCTION_SECRET_KEY
//     : Environment === "TESTING"
//     ? process.env.TESTING_SECRET_KEY
//     : Environment === "DEVELOPMENT"
//     ? process.env.DEVELOPMENT_SECRET_KEY
//     : Environment === "LOCAL"
//     ? process.env.LOCAL_SECRET_KEY
//     : "";

// const authorization = (req) => {
//   try {
//     const authorizationHeader = req.headers["authorization"];

//     if (!authorizationHeader) {
//       return null;
//     }

//     const token = authorizationHeader.split(" ")[1];

//     const decodedToken = jwt.verify(token, SECRET_KEY);
//     return decodedToken;
//   } catch (error) {
//     return null;
//   }
// };

// module.exports = {
//   authorization,
// };



require("dotenv").config();
const jwt = require("jsonwebtoken");
const { environment } = require("./environment");

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
    const header = req.headers["authorization"];
    if (!header || !header.startsWith("Bearer ")) {
      console.log("Missing or malformed authorization header");
      return null;
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, SECRET_KEY);

    if (!decoded || !decoded.id || !decoded.branch) {
      console.log("Token missing required user info");
      return null;
    }

    return decoded;
  } catch (err) {
    console.error("Authorization error:", err.message);
    return null;
  }
};

module.exports = {
  authorization,
};