import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  type: String,
  question: String,
  mediaUrl: String,
  options: [String],
  correctAnswers: [String],
});

const quizSchema = new mongoose.Schema({
  title: String,
  tags: [String],
  questions: [questionSchema],
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

export default mongoose.model('Quiz', quizSchema);