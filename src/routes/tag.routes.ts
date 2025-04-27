// routes/tag.routes.ts
import { Router } from 'express';
import { createTag } from '../controllers/tag.controller';

const router = Router();

// API tạo tag
router.post('/', createTag);

export default router;
