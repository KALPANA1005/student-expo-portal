const mongoose = require("mongoose");

const judgeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    email: {
      type: String, required: true, unique: true, trim: true, lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    phone: { type: String, match: [/^[6-9]\d{9}$/, "Please enter a valid 10-digit phone number"] },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, default: "judge", immutable: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Judge", judgeSchema);
