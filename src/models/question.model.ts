import mongoose from "mongoose";

const optionSchema = new mongoose.Schema({
  text: String,
  image: String,
  isCorrect: Boolean,
});

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["text", "image", "audio", "video"],
    default: "text",
  },
  questionText: String,
  media: String, // URL nếu có hình/âm thanh/video
  options: [optionSchema],
});

export default questionSchema;
