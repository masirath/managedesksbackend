const jwt = require("jsonwebtoken");
const secret_key = process.env.SECRET_KEY;

const authorization = (req) => {
  try {
    const authorizationHeader = req.headers["authorization"];

    if (!authorizationHeader) {
      return null;
    }

    const token = authorizationHeader.split(" ")[1];

    const decodedToken = jwt.verify(token, secret_key);
    return decodedToken;
  } catch (error) {
    return null;
  }
};

module.exports = {
  authorization,
};
