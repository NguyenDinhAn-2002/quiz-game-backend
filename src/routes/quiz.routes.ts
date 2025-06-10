import { Router } from 'express';
import {
  createQuiz,
  getAllQuizzes,
  getQuizById,
  deleteQuiz,
  updateQuiz,
  createQuizWithAI,
} from '../controllers/quiz.controller';
import { authenticate, authorizeOwnerOrAdmin } from '../middlewares/auth.middlewares';

const router = Router();


router.post('/', authenticate, createQuiz);

router.get('/', getAllQuizzes);

router.get('/:id', getQuizById);


router.delete('/:id', authenticate, authorizeOwnerOrAdmin, deleteQuiz);
router.put('/:id', authenticate, authorizeOwnerOrAdmin, updateQuiz);

router.post('/generate-ai', authenticate, createQuizWithAI);

export default router;
