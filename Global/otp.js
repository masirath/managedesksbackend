const verify = async (req, res) => {
  try {
    const otp = Math.floor(1000 + Math.random() * 9999);
    const hashed_otp = bcrypt.hash(otp, 10);
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};
