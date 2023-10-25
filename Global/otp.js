const otp_generator = () => {
  return Math.floor(1000 + Math.random() * 9999);
};

module.exports = {
  otp_generator,
};
