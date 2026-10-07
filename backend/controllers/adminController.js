const bcrypt = require("bcryptjs");
const Student = require("../models/Student");
const Project = require("../models/Project");
const Judge = require("../models/Judge");
const Event = require("../models/Event");
const Notification = require("../models/Notification");
const Evaluation = require("../models/Evaluation");
const sendEmail = require("../utils/sendEmail");

// ------------------------------------------------------------------
// GET /api/admin/stats  -> numbers for the 5 dashboard cards
// ------------------------------------------------------------------
const getStats = async (req, res) => {
  try {
    const totalRegistrations = await Project.countDocuments();
    const approved = await Project.countDocuments({ status: "Approved" });
    const rejected = await Project.countDocuments({ status: "Rejected" });
    const totalJudges = await Judge.countDocuments();
    const totalPPTUploads = await Project.countDocuments({ filePath: { $ne: null } });

    const event = await Event.findOne().sort({ createdAt: -1 });
    const maxRegistrations = event ? event.maxRegistrations : 0;

    res.status(200).json({
      success: true,
      stats: { totalRegistrations, maxRegistrations, approved, rejected, totalJudges, totalPPTUploads },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ------------------------------------------------------------------
// GET /api/admin/projects  -> every student's project, for the
// Student Management table + PPT Verification screen (same data,
// this one table covers both, matching the spec)
// ------------------------------------------------------------------
const getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find()
      .populate("student", "name email department registerNumber")
      .populate("assignedJudge", "name department")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, projects });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ------------------------------------------------------------------
// Small helper: formats a Date as "15 Sep 2026" for use inside emails
// ------------------------------------------------------------------
const formatDate = (date) => {
  if (!date) return "To be announced";
  return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// ------------------------------------------------------------------
// PUT /api/admin/projects/:id/approve
// Sets status = Approved, creates a Notification, and sends an
// automatic congratulations email to the student — exactly as per spec.
// Email now includes event venue/date + team name + team members.
// ------------------------------------------------------------------
const approveProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate("student", "name email");
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    project.status = "Approved";
    await project.save();

    await Notification.create({
      student: project.student._id,
      title: "Project Approved",
      message: `Your project "${project.projectTitle}" has been selected for Project Expo.`,
      type: "Approved",
    });

    // Send the email. Wrapped in try/catch so a bad EMAIL_USER/EMAIL_PASS
    // config never blocks the approve action itself — DB is already updated.
    try {
      // Pull the current Event so we can mention venue/date in the email
      const event = await Event.findOne().sort({ createdAt: -1 });
      const venueText = event ? event.venue : "To be announced";
      const eventDateText = event ? formatDate(event.eventDate) : "To be announced";
      const teamMembersText = project.teamMembers.join(", ");

      await sendEmail(
        project.student.email,
        "Project Expo - Project Selected",
        `Dear Team,

Congratulations! 🎉

Your project and your team "${project.projectTitle}" has been selected for the Project Expo, from BANNARI AMMAN INSTITUTE OF TECHNOLOGY, SATHYAMANGALAM.

Here are your project and event details:

Team Name: ${project.teamName}
Team Members: ${teamMembersText}
Project Title: ${project.projectTitle}
Event Date: ${eventDateText}
Venue: ${venueText}

Please carry your PPT/PDF and be present at the venue on time. Further evaluation details are available in your dashboard.

Regards,
Project Expo Team`
      );
    } catch (emailError) {
      console.error("Email sending failed:", emailError.message);
    }

    res.status(200).json({ success: true, message: "Project approved and student notified" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ------------------------------------------------------------------
// PUT /api/admin/projects/:id/reject
// Same idea as approve, but with the rejection subject/message.
// ------------------------------------------------------------------
const rejectProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate("student", "name email");
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    project.status = "Rejected";
    await project.save();

    await Notification.create({
      student: project.student._id,
      title: "Project Rejected",
      message: `Your project "${project.projectTitle}" has not been selected.`,
      type: "Rejected",
    });

    try {
      await sendEmail(
        project.student.email,
        "Project Expo Result",
        `Dear Team,

Thank you for participating in the Project Expo.

We regret to inform you that your project "${project.projectTitle}" has not been selected for the next stage.

We appreciate your effort and participation. We encourage you to participate in future events.

Regards,
Project Expo Team`
      );
    } catch (emailError) {
      console.error("Email sending failed:", emailError.message);
    }

    res.status(200).json({ success: true, message: "Project rejected and student notified" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ------------------------------------------------------------------
// PUT /api/admin/projects/:id/assign-judge   body: { judgeId }
// Only makes sense for Approved projects, but not force-restricted
// here in case Admin wants to pre-assign.
// ------------------------------------------------------------------
const assignJudge = async (req, res) => {
  try {
    const { judgeId } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    const judge = await Judge.findById(judgeId);
    if (!judge) return res.status(404).json({ success: false, message: "Judge not found" });

    project.assignedJudge = judgeId;
    await project.save();

    res.status(200).json({ success: true, message: `Judge ${judge.name} assigned` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ------------------------------------------------------------------
// JUDGE MANAGEMENT — Add / List / Edit / Delete
// (Admin creates judge accounts directly — there's no public judge
// registration page, matching the original spec: "Admin adds judge")
// ------------------------------------------------------------------
const getAllJudges = async (req, res) => {
  try {
    const judges = await Judge.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, judges });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const createJudge = async (req, res) => {
  try {
    const { name, department, email, phone, password } = req.body;

    const existing = await Judge.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: "A judge with this email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const judge = await Judge.create({ name, department, email, phone, password: hashedPassword });

    res.status(201).json({ success: true, message: "Judge added successfully", judge: { ...judge.toObject(), password: undefined } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const updateJudge = async (req, res) => {
  try {
    const { name, department, phone } = req.body;
    const judge = await Judge.findByIdAndUpdate(
      req.params.id, { name, department, phone }, { new: true, runValidators: true }
    );
    if (!judge) return res.status(404).json({ success: false, message: "Judge not found" });
    res.status(200).json({ success: true, message: "Judge updated", judge });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const deleteJudge = async (req, res) => {
  try {
    const judge = await Judge.findByIdAndDelete(req.params.id);
    if (!judge) return res.status(404).json({ success: false, message: "Judge not found" });
    res.status(200).json({ success: true, message: "Judge deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ------------------------------------------------------------------
// EVENT MANAGEMENT — get + create/update (single Event document)
// ------------------------------------------------------------------
const getEvent = async (req, res) => {
  try {
    const event = await Event.findOne().sort({ createdAt: -1 });
    res.status(200).json({ success: true, event: event || null });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const saveEvent = async (req, res) => {
  try {
    const {
      registrationStartDate, registrationEndDate, eventDate,
      venue, registrationFees, rules, instructions, maxRegistrations,
    } = req.body;

    let event = await Event.findOne().sort({ createdAt: -1 });
    if (event) {
      Object.assign(event, {
        registrationStartDate, registrationEndDate, eventDate,
        venue, registrationFees, rules, instructions, maxRegistrations,
      });
      await event.save();
    } else {
      event = await Event.create({
        registrationStartDate, registrationEndDate, eventDate,
        venue, registrationFees, rules, instructions, maxRegistrations,
      });
    }
    res.status(200).json({ success: true, message: "Event details saved", event });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ------------------------------------------------------------------
// PUT /api/admin/publish-result
// Flips isResultPublished = true on the Event, so every Student
// dashboard's Result section immediately starts showing marks + rank.
// ALSO sends every evaluated student a personal result email with
// their marks + rank, and a special "1st/2nd/3rd Place" line for
// the top 3 teams.
// ------------------------------------------------------------------
const publishResult = async (req, res) => {
  try {
    const event = await Event.findOne().sort({ createdAt: -1 });
    if (!event) return res.status(400).json({ success: false, message: "No event found. Set up event details first." });

    event.isResultPublished = true;
    await event.save();

    // Get every evaluation, sorted by total marks (highest first) so we
    // can work out each student's rank and place (1st / 2nd / 3rd).
    const evaluations = await Evaluation.find()
      .populate({ path: "project", populate: { path: "student" } })
      .sort({ totalMarks: -1 });

    for (let i = 0; i < evaluations.length; i++) {
      const evalDoc = evaluations[i];
      if (!evalDoc.project?.student) continue;

      const rank = i + 1;
      const student = evalDoc.project.student;

      // In-app notification (unchanged from before)
      await Notification.create({
        student: student._id,
        title: "Result Published",
        message: "The Project Expo result has been published. Check your Result tab.",
        type: "Result",
      });

      // Special congratulatory line only for the top 3 ranks
      let placeLine = "";
      if (rank === 1) placeLine = "🏆 Congratulations! Your team has won 1st Place!";
      else if (rank === 2) placeLine = "🥈 Congratulations! Your team has won 2nd Place!";
      else if (rank === 3) placeLine = "🥉 Congratulations! Your team has won 3rd Place!";
      else placeLine = "Thank you for your participation in the Project Expo.";

      try {
        await sendEmail(
          student.email,
          "Project Expo - Result Announcement",
          `Dear ${student.name},

${placeLine}

Here is your final result for the Project Expo:

Team Name: ${evalDoc.project.teamName}
Project Title: ${evalDoc.project.projectTitle}
Total Marks: ${evalDoc.totalMarks}/100
Rank: ${rank}

Thank you for taking part in the Project Expo. Check your dashboard for full details.

Regards,
Project Expo Team`
        );
      } catch (emailError) {
        console.error(`Result email failed for ${student.email}:`, emailError.message);
      }
    }

    res.status(200).json({ success: true, message: "Result published to all students" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ------------------------------------------------------------------
// GET /api/admin/activity  -> Recent activity feed (latest 10 events)
// Pulled together from Projects (registered/uploaded/approved/rejected),
// judge assignments, and Evaluations (marks submitted) — sorted by time.
// ------------------------------------------------------------------
const getActivity = async (req, res) => {
  try {
    const projects = await Project.find()
      .populate("student", "name")
      .populate("assignedJudge", "name")
      .sort({ updatedAt: -1 })
      .limit(15);

    const evaluations = await Evaluation.find()
      .populate({ path: "project", populate: { path: "student", select: "name" } })
      .sort({ createdAt: -1 })
      .limit(15);

    const activities = [];

    projects.forEach((p) => {
      activities.push({
        icon: "📝",
        text: `${p.student?.name || "A student"} registered project "${p.projectTitle}"`,
        time: p.createdAt,
      });
      if (p.filePath) {
        activities.push({ icon: "☁️", text: `${p.student?.name || "A student"} uploaded PPT`, time: p.updatedAt });
      }
      if (p.status === "Approved") {
        activities.push({ icon: "✅", text: `${p.student?.name || "A student"}'s project approved`, time: p.updatedAt });
      }
      if (p.status === "Rejected") {
        activities.push({ icon: "❌", text: `${p.student?.name || "A student"}'s project rejected`, time: p.updatedAt });
      }
      if (p.assignedJudge) {
        activities.push({ icon: "⚖️", text: `Judge ${p.assignedJudge.name} assigned to "${p.projectTitle}"`, time: p.updatedAt });
      }
    });

    evaluations.forEach((e) => {
      activities.push({
        icon: "📊",
        text: `Marks submitted for "${e.project?.student?.name || "a project"}" (${e.totalMarks}/100)`,
        time: e.createdAt,
      });
    });

    activities.sort((a, b) => new Date(b.time) - new Date(a.time));

    res.status(200).json({ success: true, activities: activities.slice(0, 10) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

module.exports = {
  getStats, getAllProjects, approveProject, rejectProject, assignJudge,
  getAllJudges, createJudge, updateJudge, deleteJudge,
  getEvent, saveEvent, publishResult, getActivity,
};