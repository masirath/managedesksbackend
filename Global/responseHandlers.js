// Global/responseHandlers.js

const success_200 = (res, message, data = null) => {
    res.status(200).json({ success: true, message, data });
  };
  
  const failed_400 = (res, message) => {
    res.status(400).json({ success: false, message });
  };
  
  const incomplete_400 = (res) => {
    res.status(400).json({ success: false, message: "Incomplete request data" });
  };
  
  const unauthorized = (res) => {
    res.status(401).json({ success: false, message: "Unauthorized access" });
  };
  
  const catch_400 = (res, error) => {
    res.status(400).json({ success: false, message: "Error occurred", error });
  };
  
  module.exports = { success_200, failed_400, incomplete_400, unauthorized, catch_400 };
  