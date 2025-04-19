import Quiz from '../models/quiz.model';
import { Request, Response } from 'express';

export const createQuiz = async (req: Request, res: Response): Promise<void> => {
  try {
    const newQuiz = new Quiz({
      ...req.body,
      author: req.body.author || null,
    });
    const saved = await newQuiz.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('[❌ CREATE QUIZ ERROR]:', err);
    res.status(500).json({ message: 'Tạo quiz thất bại', error: err });
  }
};

export const getAllQuizzes = async (_req: Request, res: Response): Promise<void> => {
  const quizzes = await Quiz.find().populate('createdBy');
  res.status(200).json(quizzes);
};

export const getQuizById = async (req: Request, res: Response): Promise<void> => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('createdBy');
    if (!quiz) {
      res.status(404).json({ message: 'Quiz không tồn tại' });
      return;
    }
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi lấy quiz', error: err });
  }
};

export const deleteQuiz = async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await Quiz.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ message: 'Quiz không tồn tại' });
      return;
    }
    res.json({ message: 'Xoá quiz thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi xoá quiz', error: err });
  }
};
