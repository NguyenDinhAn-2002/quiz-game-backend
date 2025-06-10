import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/user.model';
import { AuthenticatedRequest } from '../middlewares/auth.middlewares';

// Lấy profile của chính người dùng
export const getMyProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Không xác thực người dùng' });
    return;
  }

  const { _id, name, email, avatar, role, provider, createdAt, updatedAt } = req.user;

  res.json({ _id, name, email, avatar, role, provider, createdAt, updatedAt });
};

// Cập nhật profile
export const updateMyProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Không xác thực người dùng' });
    return;
  }

  const { name, avatar } = req.body;

  try {
    req.user.name = name || req.user.name;
    req.user.avatar = avatar || req.user.avatar;
    await req.user.save();

    res.json({ message: 'Cập nhật thành công', user: req.user });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi cập nhật profile', error: err });
  }
};

// Đổi mật khẩu
export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;

  if (!req.user) {
    res.status(401).json({ message: 'Không xác thực người dùng' });
    return;
  }

  const isMatch = await bcrypt.compare(currentPassword, req.user.password);
  if (!isMatch) {
    res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });
    return;
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  req.user.password = hashed;
  await req.user.save();

  res.json({ message: 'Đổi mật khẩu thành công' });
};

// ADMIN - lấy toàn bộ users
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find().select('-password'); // Không trả password
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi lấy danh sách users', error: err });
  }
};

// PUBLIC - lấy user theo ID (ẩn password)
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      res.status(404).json({ message: 'Không tìm thấy người dùng' });
      return;
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi truy xuất user', error: err });
  }
};

// ADMIN - xóa user
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      res.status(404).json({ message: 'Không tìm thấy người dùng để xóa' });
      return;
    }

    res.json({ message: 'Xóa người dùng thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi xóa người dùng', error: err });
  }
};
