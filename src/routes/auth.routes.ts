import { Router, Request, Response } from 'express';
import { register, login } from '../controllers/auth.controller';

const router = Router();

// Đảm bảo các controller nhận đúng tham số kiểu dữ liệu
router.post('/register', async (req: Request, res: Response) => {
  try {
    await register(req, res);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    await login(req, res);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
