import mongoose from "mongoose";
import questionSchema from "./question.model";

const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    tags: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tag" }],
    questions: [questionSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const Quiz = mongoose.model("Quiz", quizSchema);
export default Quiz;
