// controllers/quiz.controller.ts
import Quiz from '../models/quiz.model';
import { Request, Response } from 'express';
import { UploadedFile } from 'express-fileupload';
import { uploadSingleFile } from '../middlewares/cloudinary.middleware';

export const createQuiz = async (req: Request, res: Response): Promise<void> => {
  try {
    let thumbnailUrl: string | undefined;

    // Upload thumbnail nếu có
    if (req.files && req.files.thumbnail) {
      const file = req.files.thumbnail as UploadedFile;
      thumbnailUrl = await uploadSingleFile(file);
    }

    // Parse questions từ chuỗi JSON (gửi từ Postman hoặc frontend)
    const questions = JSON.parse(req.body.questions);

    const processedQuestions = await Promise.all(
      questions.map(async (question: any, index: number) => {
        const mediaFieldName = `questionMedia_${index}`;
        let media = { type: 'text', url: '' };

        if (req.files && req.files[mediaFieldName]) {
          const file = req.files[mediaFieldName] as UploadedFile;
          const uploadedUrl = await uploadSingleFile(file);

          media = {
            type: question.mediaType || 'image',
            url: uploadedUrl,
          };
        }

        return {
          ...question,
          media,
        };
      })
    );

    const newQuiz = new Quiz({
      title: req.body.title,
      description: req.body.description,
      thumbnail: thumbnailUrl,
      tags: req.body.tags ? JSON.parse(req.body.tags) : [],
      questions: processedQuestions,
      createdBy: req.body.createdBy || null,
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

export const updateQuiz = async (req: Request, res: Response): Promise<void> => {
  try {
    const quizId = req.params.id;
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      res.status(404).json({ message: 'Quiz không tồn tại' });
      return;
    }

    let thumbnailUrl: string | undefined;
    if (req.files && req.files.thumbnail) {
      const file = req.files.thumbnail as UploadedFile;
      thumbnailUrl = await uploadSingleFile(file);
    }

    quiz.title = req.body.title || quiz.title;
    quiz.description = req.body.description || quiz.description;
    if (thumbnailUrl) quiz.thumbnail = thumbnailUrl;
    quiz.tags = req.body.tags ? JSON.parse(req.body.tags) : quiz.tags;

    const questions = JSON.parse(req.body.questions || '[]');
    const processedQuestions = await Promise.all(
      questions.map(async (question: any, index: number) => {
        const mediaFieldName = `questionMedia_${index}`;
        let media = { type: 'text', url: '' };

        if (req.files && req.files[mediaFieldName]) {
          const file = req.files[mediaFieldName] as UploadedFile;
          const uploadedUrl = await uploadSingleFile(file);

          media = {
            type: question.mediaType || 'image',
            url: uploadedUrl,
          };
        }

        return {
          ...question,
          media,
        };
      })
    );

    quiz.questions = processedQuestions.length ? (processedQuestions as typeof quiz.questions) : quiz.questions;

    const updatedQuiz = await quiz.save();
    res.status(200).json(updatedQuiz);
  } catch (err) {
    console.error('[❌ UPDATE QUIZ ERROR]:', err);
    res.status(500).json({ message: 'Cập nhật quiz thất bại', error: err });
  }
};
