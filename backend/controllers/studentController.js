const Student = require("../models/Student");
const Project = require("../models/Project");
const Event = require("../models/Event");
const Notification = require("../models/Notification");
const Evaluation = require("../models/Evaluation");

const getProfile = async (req, res) => {
  res.status(200).json({ success: true, profile: req.user });
};

const updateProfile = async (req, res) => {
  try {
    const { name, department, year, phone } = req.body;
    const updated = await Student.findByIdAndUpdate(
      req.user._id,
      { name, department, year, phone },
      { new: true, runValidators: true }
    ).select("-password");
    res.status(200).json({ success: true, message: "Profile updated", profile: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const registerProject = async (req, res) => {
  try {
    const { projectTitle, projectDomain, guideName, teamName, teamMembers } = req.body;
    const membersArray = Array.isArray(teamMembers)
      ? teamMembers
      : String(teamMembers || "").split(",").map((m) => m.trim()).filter(Boolean);

    const event = await Event.findOne().sort({ createdAt: -1 });
    if (event && !event.isRegistrationOpen) {
      return res.status(400).json({ success: false, message: "Registration is closed for this event" });
    }

    let project = await Project.findOne({ student: req.user._id });
    if (project) {
      project.projectTitle = projectTitle;
      project.projectDomain = projectDomain;
      project.guideName = guideName;
      project.teamName = teamName;
      project.teamMembers = membersArray;
      await project.save();
    } else {
      project = await Project.create({
        student: req.user._id, projectTitle, projectDomain, guideName, teamName, teamMembers: membersArray,
      });
      if (event) {
        const count = await Project.countDocuments();
        if (count >= event.maxRegistrations) {
          event.isRegistrationOpen = false;
          await event.save();
        }
      }
    }
    res.status(200).json({ success: true, message: "Project details saved", project });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const getProject = async (req, res) => {
  try {
    const project = await Project.findOne({ student: req.user._id }).populate("assignedJudge", "name department");
    res.status(200).json({ success: true, project: project || null });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const uploadPPT = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
    const project = await Project.findOne({ student: req.user._id });
    if (!project) return res.status(400).json({ success: false, message: "Please register your project before uploading" });

    const event = await Event.findOne().sort({ createdAt: -1 });
    if (event && !event.isRegistrationOpen) {
      return res.status(400).json({ success: false, message: "Registration is closed, upload not allowed" });
    }

    project.filePath = "/uploads/" + req.file.filename;
    project.fileType = req.file.mimetype === "application/pdf" ? "pdf" : "ppt";
    await project.save();
    res.status(200).json({ success: true, message: "File uploaded successfully", filePath: project.filePath });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const getEvent = async (req, res) => {
  try {
    const event = await Event.findOne().sort({ createdAt: -1 });
    res.status(200).json({ success: true, event: event || null });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const getAssignedJudge = async (req, res) => {
  try {
    const project = await Project.findOne({ student: req.user._id }).populate("assignedJudge", "name department");
    res.status(200).json({ success: true, judge: project?.assignedJudge || null });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ student: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const getResult = async (req, res) => {
  try {
    const event = await Event.findOne().sort({ createdAt: -1 });
    if (!event || !event.isResultPublished) return res.status(200).json({ success: true, published: false, result: null });

    const project = await Project.findOne({ student: req.user._id });
    if (!project) return res.status(200).json({ success: true, published: true, result: null });

    const myEvaluation = await Evaluation.findOne({ project: project._id });
    if (!myEvaluation) return res.status(200).json({ success: true, published: true, result: null });

    const allEvaluations = await Evaluation.find().sort({ totalMarks: -1 });
    const rank = allEvaluations.findIndex((e) => e._id.equals(myEvaluation._id)) + 1;

    res.status(200).json({
      success: true, published: true,
      result: { teamName: project.teamName, totalMarks: myEvaluation.totalMarks, rank },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

module.exports = {
  getProfile, updateProfile, registerProject, getProject, uploadPPT,
  getEvent, getAssignedJudge, getNotifications, getResult,
};
