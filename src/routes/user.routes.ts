import { Router } from 'express';
import {
  getMyProfile,
  updateMyProfile,
  changePassword,
  getAllUsers,
  getUserById,
  deleteUser,
} from '../controllers/user.controller';
import { authenticate, authorizeAdmin } from '../middlewares/auth.middlewares';

const router = Router();

// Người dùng - profile
router.get('/me', authenticate, getMyProfile);
router.put('/me', authenticate, updateMyProfile);
router.put('/change-password', authenticate, changePassword);

// Admin - quản lý user
router.get('/', authenticate, authorizeAdmin, getAllUsers);
router.get('/:id', authenticate, getUserById); // Public: có thể hiển thị thông tin cơ bản
router.delete('/:id', authenticate, authorizeAdmin, deleteUser);

export default router;
