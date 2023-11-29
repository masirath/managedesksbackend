const otp_generator = () => {
  return Math.floor(1000 + Math.random() * 9000);
};

module.exports = {
  otp_generator,
};
