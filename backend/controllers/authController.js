const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const Student = require("../models/Student");
const Admin = require("../models/Admin");
const Judge = require("../models/Judge");
const generateToken = require("../utils/generateToken");

const roleModelMap = { student: Student, admin: Admin, judge: Judge };

const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const { role } = req.params;
    const Model = roleModelMap[role];
    if (!Model) return res.status(400).json({ success: false, message: "Invalid role specified" });

    const { email, password } = req.body;

    const existingUser = await Model.findOne({ email });
    if (existingUser) return res.status(400).json({ success: false, message: "Email already registered" });

    if (role === "student") {
      const existingReg = await Student.findOne({ registerNumber: req.body.registerNumber });
      if (existingReg) return res.status(400).json({ success: false, message: "Register number already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await Model.create({ ...req.body, password: hashedPassword });
    const token = generateToken(newUser._id, role);

    res.status(201).json({
      success: true,
      message: `${role} registered successfully`,
      token,
      user: { id: newUser._id, name: newUser.name, email: newUser.email, role },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const { role } = req.params;
    const Model = roleModelMap[role];
    if (!Model) return res.status(400).json({ success: false, message: "Invalid role specified" });

    const { email, password } = req.body;

    const user = await Model.findOne({ email }).select("+password");
    if (!user) return res.status(401).json({ success: false, message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid email or password" });

    const token = generateToken(user._id, role);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: { id: user._id, name: user.name, email: user.email, role },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const getMe = async (req, res) => {
  res.status(200).json({ success: true, user: req.user, role: req.role });
};

module.exports = { register, login, getMe };
