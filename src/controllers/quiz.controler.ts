import Quiz from '../models/quiz.model';

export const createQuiz = async (req: any, res: any) => {
    try {
      const quiz = new Quiz({
        ...req.body,
        author: req.user?._id || null,
      });
      await quiz.save();
      res.status(201).json(quiz);
    } catch (err) {
      console.error('[❌ CREATE QUIZ ERROR]:', err); // in lỗi chi tiết
      res.status(500).json({ message: 'Failed to create quiz', error: err });
    }
  };
  

export const getQuizzes = async (_req: any, res: any) => {
  const quizzes = await Quiz.find();
  res.json(quizzes);
};
