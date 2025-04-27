// controllers/tag.controller.ts
import { Request, Response } from 'express';
import Tag from '../models/tag.model';

export const createTag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;

    // Kiểm tra nếu tag đã tồn tại
    const existingTag = await Tag.findOne({ name });
    if (existingTag) {
      res.status(400).json({ message: 'Tag đã tồn tại' });
      return;
    }

    const newTag = new Tag({ name });
    const savedTag = await newTag.save();
    res.status(201).json(savedTag);
  } catch (err) {
    console.error('[❌ CREATE TAG ERROR]:', err);
    res.status(500).json({ message: 'Tạo tag thất bại', error: err });
  }
};
