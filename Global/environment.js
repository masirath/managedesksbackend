const environment = (req) => {
  try {
    const Environment = "PRODUCTION";
    // const Environment = "TESTING";
    // const Environment = "DEVELOPMENT";
    // const Environment = "LOCAL";

    return Environment;
  } catch (error) {
    return null;
  }
};

module.exports = {
  environment,
};
