const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, unique: true },
    projectTitle: { type: String, required: true, trim: true },
    projectDomain: { type: String, required: true, trim: true },
    guideName: { type: String, required: true, trim: true },
    teamName: { type: String, required: true, trim: true },
    teamMembers: {
      type: [String],
      validate: { validator: (arr) => arr.length > 0, message: "At least one team member is required" },
    },
    filePath: { type: String, default: null },
    fileType: { type: String, enum: ["ppt", "pdf", null], default: null },
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    assignedJudge: { type: mongoose.Schema.Types.ObjectId, ref: "Judge", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Project", projectSchema);
