//Định nghĩa các route API
import { Router } from 'express';
import quizRoutes from './quiz.routes';
import authRoutes from './auth.routes';
import tagRoutes from './tag.routes'; // nếu có auth

const router = Router();

router.use('/quiz', quizRoutes);
router.use('/auth', authRoutes);
router.use('/tag', tagRoutes); // nếu có auth

export default router;
