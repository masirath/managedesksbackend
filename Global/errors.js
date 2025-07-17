const catch_400 = (res, error) => {
  return res.json({
    status: false,
    status_code: 400,
    message: "Something went wrong",
    error: error,
  });
};

const incomplete_400 = (res) => {
  return res.json({
    status: false,
    status_code: 400,
    message: "Incomplete submission",
  });
};

const failed_400 = (res, message) => {
  return res.json({ status: false, status_code: 400, message: message });
};

const error_400 = (res, code, message) => {
  return res.json({ status: false, status_code: code, message: message });
};

const success_200 = (res, message, data) => {
  return res.json({
    status: true,
    status_code: 200,
    message: message,
    data: data,
  });
};

const unauthorized = (res) => {
  return res.json({
    status: false,
    status_code: 400,
    message: "Unauthorized",
  });
};

const unauthorized_403 = (res) => {
  return res.json({
    status: false,
    status_code: 403,
    message: "Unauthorized",
  });
};

module.exports = {
  catch_400,
  incomplete_400,
  failed_400,
  error_400,
  success_200,
  unauthorized,
  unauthorized_403,
};
