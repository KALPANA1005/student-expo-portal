const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  getProfile, updateProfile, registerProject, getProject, uploadPPT,
  getEvent, getAssignedJudge, getNotifications, getResult,
} = require("../controllers/studentController");

const router = express.Router();
router.use(protect, authorize("student"));

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.post("/project", registerProject);
router.get("/project", getProject);
router.post("/upload-ppt", upload.single("file"), uploadPPT);
router.get("/event", getEvent);
router.get("/judge", getAssignedJudge);
router.get("/notifications", getNotifications);
router.get("/result", getResult);

module.exports = router;
