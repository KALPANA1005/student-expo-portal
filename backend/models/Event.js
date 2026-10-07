const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    registrationStartDate: { type: Date, required: true },
    registrationEndDate: { type: Date, required: true },
    eventDate: { type: Date, required: true },
    venue: { type: String, required: true, trim: true },
    registrationFees: { type: Number, required: true, default: 0 },
    rules: { type: String, default: "" },
    instructions: { type: String, default: "" },
    maxRegistrations: { type: Number, required: true, default: 100 },
    isRegistrationOpen: { type: Boolean, default: true },
    isResultPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
