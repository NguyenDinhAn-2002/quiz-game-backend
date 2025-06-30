import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import User from '../models/user.model';
import Quiz from '../models/quiz.model';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in the environment variables!');
}

// Mở rộng Request interface để thêm thuộc tính user
export interface AuthenticatedRequest extends Request {
  user?: any; // Thay any bằng kiểu user nếu có interface/model cụ thể
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ message: 'Thiếu token' });
    return;
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      res.status(401).json({ message: 'Người dùng không hợp lệ' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(403).json({ message: 'Token không hợp lệ', error: err });
    return;
  }
};

export const authorizeOwnerOrAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const quizId = req.params.id;
    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      res.status(404).json({ message: 'Quiz không tồn tại' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ message: 'Chưa xác thực người dùng' });
      return;
    }

    const isOwner = quiz.createdBy?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      res.status(403).json({ message: 'Không có quyền truy cập' });
      return;
    }

    next();
  } catch (err) {
    res.status(500).json({ message: 'Lỗi phân quyền', error: err });
    return;
  }
};
export const authorizeAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ message: 'Chỉ admin mới được phép truy cập' });
    return;
  }
  next();
};
