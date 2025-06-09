import { Router } from 'express';
import quizRoutes from './quiz.routes';
import authRoutes from './auth.routes';
import tagRoutes from './tag.routes';
import userRoutes from './user.routes';

const router = Router();

router.use('/quiz', quizRoutes);
router.use('/auth', authRoutes);
router.use('/tags', tagRoutes);
router.use('/users', userRoutes);
export default router;
