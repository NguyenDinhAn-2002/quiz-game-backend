import { Request, Response } from 'express';
import Tag from '../models/tag.model';

/**
 * [POST] /tags - Tạo tag mới
 */
export const createTag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ message: 'Tên tag không hợp lệ' });
      return;
    }

    const normalizedTag = name.trim().toLowerCase();

    // Kiểm tra nếu tag đã tồn tại
    const existingTag = await Tag.findOne({ name: normalizedTag });
    if (existingTag) {
      res.status(400).json({ message: 'Tag đã tồn tại' });
      return;
    }

    const newTag = new Tag({ name: normalizedTag });
    const savedTag = await newTag.save();
    res.status(201).json(savedTag);
  } catch (err) {
    console.error('[❌ CREATE TAG ERROR]:', err);
    res.status(500).json({ message: 'Tạo tag thất bại', error: err });
  }
};

/**
 * [GET] /tags - Lấy tất cả tag
 */
export const getAllTags = async (_req: Request, res: Response): Promise<void> => {
  try {
    const tags = await Tag.find();
    res.status(200).json(tags);
  } catch (err) {
    console.error('[❌ GET ALL TAGS ERROR]:', err);
    res.status(500).json({ message: 'Lỗi khi lấy tất cả tag', error: err });
  }
};

/**
 * [GET] /tags/:id - Lấy tag theo ID
 */
export const getTagById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const tag = await Tag.findById(id);
    if (!tag) {
      res.status(404).json({ message: 'Không tìm thấy tag' });
      return;
    }

    res.status(200).json(tag);
  } catch (err) {
    console.error('[❌ GET TAG BY ID ERROR]:', err);
    res.status(500).json({ message: 'Lỗi khi lấy tag', error: err });
  }
};
