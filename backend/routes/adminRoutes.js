const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getStats, getAllProjects, approveProject, rejectProject, assignJudge,
  getAllJudges, createJudge, updateJudge, deleteJudge,
  getEvent, saveEvent, publishResult, getActivity,
} = require("../controllers/adminController");

const router = express.Router();
router.use(protect, authorize("admin"));

router.get("/stats", getStats);
router.get("/activity", getActivity);

router.get("/projects", getAllProjects);
router.put("/projects/:id/approve", approveProject);
router.put("/projects/:id/reject", rejectProject);
router.put("/projects/:id/assign-judge", assignJudge);

router.get("/judges", getAllJudges);
router.post("/judges", createJudge);
router.put("/judges/:id", updateJudge);
router.delete("/judges/:id", deleteJudge);

router.get("/event", getEvent);
router.post("/event", saveEvent);

router.put("/publish-result", publishResult);

module.exports = router;
