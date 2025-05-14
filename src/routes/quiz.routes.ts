import { Router } from 'express';
import {
  createQuiz,
  getAllQuizzes,
  getQuizById,
  deleteQuiz,
  updateQuiz,
  createQuizWithAI,
} from "../controllers/quiz.controller";



const router = Router();

router.post('/', createQuiz);
router.get('/', getAllQuizzes);
router.get('/:id', getQuizById);
router.delete('/:id', deleteQuiz);
router.put('/quizzes/:id', updateQuiz); 
router.post('/generate-ai', createQuizWithAI);



export default router;
