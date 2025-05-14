// routes/tag.routes.ts
import { Router } from 'express';
import { createTag, getTagById } from '../controllers/tag.controller';

const router = Router();

// API tạo tag
router.post('/', createTag);
router.get('/tags/:id', getTagById);

export default router;
