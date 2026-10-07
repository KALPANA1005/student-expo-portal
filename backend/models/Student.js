const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    registerNumber: { type: String, required: true, unique: true, trim: true },
    department: { type: String, required: true, trim: true },
    year: { type: String, required: true, enum: ["1", "2", "3", "4"] },
    email: {
      type: String, required: true, unique: true, trim: true, lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    phone: { type: String, required: true, match: [/^[6-9]\d{9}$/, "Please enter a valid 10-digit phone number"] },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, default: "student", immutable: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Student", studentSchema);
