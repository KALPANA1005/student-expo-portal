const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const Event = require("./models/Event");
const Judge = require("./models/Judge");
const Admin = require("./models/Admin");

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for seeding...");

    const existingEvent = await Event.findOne();
    if (!existingEvent) {
      await Event.create({
        registrationStartDate: new Date("2026-08-01"),
        registrationEndDate: new Date("2026-08-28"),
        eventDate: new Date("2026-09-15"),
        venue: "Main Auditorium",
        registrationFees: 200,
        rules: "Team size max 4. Original work only.",
        instructions: "Bring your PPT on a USB drive as backup.",
        maxRegistrations: 100,
        isRegistrationOpen: true,
        isResultPublished: false,
      });
      console.log("Demo Event created.");
    } else {
      console.log("Event already exists, skipping.");
    }

    const existingJudge = await Judge.findOne({ email: "judge@gmail.com" });
    if (!existingJudge) {
      const hashedPassword = await bcrypt.hash("judge123", 10);
      await Judge.create({
        name: "Dr. S. Priya", department: "CSE", email: "judge@gmail.com",
        phone: "9876500000", password: hashedPassword,
      });
      console.log("Demo Judge created: judge@gmail.com / judge123");
    } else {
      console.log("Judge already exists, skipping.");
    }

    const existingAdmin = await Admin.findOne({ email: "admin@gmail.com" });
    if (!existingAdmin) {
      const hashedAdminPassword = await bcrypt.hash("admin123", 10);
      await Admin.create({ name: "Portal Admin", email: "admin@gmail.com", password: hashedAdminPassword });
      console.log("Demo Admin created: admin@gmail.com / admin123");
    } else {
      console.log("Admin already exists, skipping.");
    }

    console.log("Seeding complete.");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exit(1);
  }
};

seed();
