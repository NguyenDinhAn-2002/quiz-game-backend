import mongoose from "mongoose";

const optionSchema = new mongoose.Schema({
  text: String,
  isCorrect: Boolean,
});

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  media: {
    type: {
      type: String,
      enum: ['image', 'audio', 'video', 'text'],
      default: 'text'
    },
    url: { type: String }
  },
  questionType: {
    type: String,
    enum: ['single', 'multiple', 'order', 'input'],
    required: true
  },
  options: [optionSchema],
  timeLimit: {
    type: Number,
    required: true,
    default: 20, 
    min: 5,      
    max: 90     
  }
});

export default questionSchema;
