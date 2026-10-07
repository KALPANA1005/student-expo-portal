const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String, required: true, unique: true, trim: true, lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, default: "admin", immutable: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", adminSchema);
