import Quiz from '../models/quiz.model';
import { Request, Response, NextFunction } from 'express';
import cloudinary from '../config/cloudinary';
import { UploadedFile } from 'express-fileupload';


export const createQuiz = async (req: Request, res: Response): Promise<void> => {
  try {
    let thumbnailUrl: string | undefined;

    // Upload thumbnail nếu có
    if (req.files && req.files.thumbnail) {
      const file = req.files.thumbnail as UploadedFile;
      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        resource_type: 'auto',
      });
      thumbnailUrl = result.secure_url;
    }

    // Parse questions từ chuỗi JSON (gửi từ Postman hoặc frontend)
    const questions = JSON.parse(req.body.questions); // Chuỗi JSON

    // Duyệt từng câu hỏi để xử lý media nếu có
    const processedQuestions = await Promise.all(
      questions.map(async (question: any, index: number) => {
        const mediaFieldName = `questionMedia_${index}`;
        let media = { type: 'text', url: '' };

        if (req.files && req.files[mediaFieldName]) {
          const file = req.files[mediaFieldName] as UploadedFile;
          const upload = await cloudinary.uploader.upload(file.tempFilePath, {
            resource_type: 'auto',
          });

          media = {
            type: question.mediaType || 'image', // hoặc tự detect theo mimetype
            url: upload.secure_url,
          };
        }

        return {
          ...question,
          media,
        };
      })
    );

    // Tạo quiz mới
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

    // Tìm quiz theo id
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      res.status(404).json({ message: 'Quiz không tồn tại' });
      return;
    }

    // Nếu có thumbnail mới, upload và cập nhật
    let thumbnailUrl: string | undefined;
    if (req.files && req.files.thumbnail) {
      const file = req.files.thumbnail as UploadedFile;
      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        resource_type: 'auto',
      });
      thumbnailUrl = result.secure_url;
    }

    // Cập nhật thông tin quiz từ request body
    quiz.title = req.body.title || quiz.title;
    quiz.description = req.body.description || quiz.description;
    if (thumbnailUrl) quiz.thumbnail = thumbnailUrl;
    quiz.tags = req.body.tags ? JSON.parse(req.body.tags) : quiz.tags;

    // Nếu có câu hỏi mới, cập nhật các câu hỏi
    const questions = JSON.parse(req.body.questions || '[]');
    const processedQuestions = await Promise.all(
      questions.map(async (question: any, index: number) => {
        const mediaFieldName = `questionMedia_${index}`;
        let media = { type: 'text', url: '' };

        if (req.files && req.files[mediaFieldName]) {
          const file = req.files[mediaFieldName] as UploadedFile;
          const upload = await cloudinary.uploader.upload(file.tempFilePath, {
            resource_type: 'auto',
          });

          media = {
            type: question.mediaType || 'image', // Hoặc tự detect theo mimeType
            url: upload.secure_url,
          };
        }

        return {
          ...question,
          media,
        };
      })
    );

    quiz.questions = processedQuestions.length ? (processedQuestions as typeof quiz.questions) : quiz.questions;

    // Lưu quiz đã cập nhật
    const updatedQuiz = await quiz.save();
    res.status(200).json(updatedQuiz);
  } catch (err) {
    console.error('[❌ UPDATE QUIZ ERROR]:', err);
    res.status(500).json({ message: 'Cập nhật quiz thất bại', error: err });
  }
};



