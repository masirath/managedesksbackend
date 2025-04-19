const { success_200, failed_400 } = require("../Global/responseHandlers");

exports.uploadFiles = async (req, res) => {
  // try {
  //   if (!req.files || req.files.length === 0) {
  //     return failed_400(res, "No files were uploaded");
  //   }
  //   const files = req.files.map((file) => ({
  //     url: `/uploads/${file.filename}`,
  //     type: file.mimetype,
  //     name: file.originalname,
  //     size: file.size,
  //     uploadedAt: new Date(),
  //   }));
  //   return success_200(res, "Files uploaded successfully", { files });
  // } catch (error) {
  //   console.error("Upload error:", error);
  //   return failed_400(res, error.message);
  // }
};
