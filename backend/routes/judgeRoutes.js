const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const { getAssignedProjects, submitEvaluation } = require("../controllers/judgeController");

const router = express.Router();

// Every route below requires: logged in (protect) + role must be "judge"
router.use(protect, authorize("judge"));

router.get("/projects", getAssignedProjects);
router.post("/evaluate/:projectId", submitEvaluation);

module.exports = router;
