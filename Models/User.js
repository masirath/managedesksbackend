const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }, // Unique username
  email: { type: String, required: true, unique: true }, // Unique email
  password: { type: String, required: true }, // Hashed password
  role: { type: String, enum: ["Admin", "User"], default: "User" }, // User role
  createdAt: { type: Date, default: Date.now }, // Timestamp of creation
});

module.exports = mongoose.model("User", UserSchema);