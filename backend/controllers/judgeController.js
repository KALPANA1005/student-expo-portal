const Project = require("../models/Project");
const Evaluation = require("../models/Evaluation");

// ------------------------------------------------------------------
// GET /api/judge/projects
// Only shows projects that Admin has:
//   1. Approved (status === "Approved")
//   2. Assigned to THIS logged-in judge (assignedJudge === req.user._id)
// Each project also tells the frontend whether it's already evaluated.
// ------------------------------------------------------------------
const getAssignedProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      assignedJudge: req.user._id,
      status: "Approved",
    })
      .populate("student", "name department registerNumber")
      .sort({ createdAt: -1 });

    // For each project, check if this judge has already submitted marks for it
    const projectIds = projects.map((p) => p._id);
    const evaluations = await Evaluation.find({ project: { $in: projectIds } });
    const evaluatedProjectIds = new Set(evaluations.map((e) => e.project.toString()));

    const result = projects.map((p) => ({
      _id: p._id,
      teamName: p.teamName,
      projectTitle: p.projectTitle,
      projectDomain: p.projectDomain,
      student: p.student,
      filePath: p.filePath,
      fileType: p.fileType,
      evaluated: evaluatedProjectIds.has(p._id.toString()),
    }));

    res.status(200).json({ success: true, projects: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ------------------------------------------------------------------
// POST /api/judge/evaluate/:projectId
// body: { presentation, technicalKnowledge, innovation, documentation, remarks }
// Saves marks to the Evaluation collection. Total is auto-calculated
// by the Evaluation model's pre-save hook (already built in Week 1).
// A judge can only submit ONCE per project — this is enforced here.
// ------------------------------------------------------------------
const submitEvaluation = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { presentation, technicalKnowledge, innovation, documentation, remarks } = req.body;

    // Make sure this project is actually assigned to THIS judge and is approved
    const project = await Project.findOne({
      _id: projectId,
      assignedJudge: req.user._id,
      status: "Approved",
    });
    if (!project) {
      return res.status(403).json({
        success: false,
        message: "This project is not assigned to you, or is not yet approved",
      });
    }

    // Block a second submission — marks are locked once submitted
    const existing = await Evaluation.findOne({ project: projectId });
    if (existing) {
      return res.status(400).json({ success: false, message: "Marks already submitted for this project" });
    }

    const evaluation = await Evaluation.create({
      project: projectId,
      judge: req.user._id,
      presentation,
      technicalKnowledge,
      innovation,
      documentation,
      remarks,
      isSubmitted: true,
    });

    res.status(201).json({
      success: true,
      message: "Marks submitted successfully",
      evaluation,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

module.exports = { getAssignedProjects, submitEvaluation };
