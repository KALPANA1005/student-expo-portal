const mongoose = require("mongoose");

const evaluationSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, unique: true },
    judge: { type: mongoose.Schema.Types.ObjectId, ref: "Judge", required: true },
    presentation: { type: Number, min: 0, max: 30, required: true },
    technicalKnowledge: { type: Number, min: 0, max: 30, required: true },
    innovation: { type: Number, min: 0, max: 20, required: true },
    documentation: { type: Number, min: 0, max: 20, required: true },
    totalMarks: { type: Number, min: 0, max: 100 },
    remarks: { type: String, default: "" },
    isSubmitted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

evaluationSchema.pre("save", function (next) {
  this.totalMarks = this.presentation + this.technicalKnowledge + this.innovation + this.documentation;
  next();
});

module.exports = mongoose.model("Evaluation", evaluationSchema);
