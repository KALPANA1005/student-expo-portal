const jwt = require("jsonwebtoken");
const Student = require("../models/Student");
const Admin = require("../models/Admin");
const Judge = require("../models/Judge");

const roleModelMap = { student: Student, admin: Admin, judge: Judge };

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const Model = roleModelMap[decoded.role];
      if (!Model) return res.status(401).json({ success: false, message: "Invalid role in token" });

      const user = await Model.findById(decoded.id).select("-password");
      if (!user) return res.status(401).json({ success: false, message: "User no longer exists" });

      req.user = user;
      req.role = decoded.role;
      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: "Not authorized, invalid token" });
    }
  } else {
    return res.status(401).json({ success: false, message: "Not authorized, no token provided" });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.role)) {
    return res.status(403).json({ success: false, message: `Role '${req.role}' cannot access this resource` });
  }
  next();
};

module.exports = { protect, authorize };
