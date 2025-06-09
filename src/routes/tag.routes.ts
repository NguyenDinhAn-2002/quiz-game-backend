import { Router } from 'express';
import { createTag, getTagById, getAllTags } from '../controllers/tag.controller';
import { authenticate } from '../middlewares/auth.middlewares';

const router = Router();

// Tạo tag (cần đăng nhập)
router.post('/', authenticate, createTag);

// Lấy tất cả tag (thường public nên không cần auth)
router.get('/', getAllTags);

// Lấy tag theo id (cũng public, sửa lại route cho chuẩn REST)
router.get('/:id', getTagById);

export default router;
