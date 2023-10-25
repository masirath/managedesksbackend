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

const success_200 = (res, message, data) => {
  return res.json({
    status: true,
    status_code: 200,
    message: message,
    data: data,
  });
};

module.exports = {
  catch_400,
  incomplete_400,
  failed_400,
  success_200,
};
