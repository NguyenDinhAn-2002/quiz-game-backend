
import cloudinary from '../config/cloudinary';
import { Request, Response, NextFunction } from 'express';

export const uploadImage = (req: Request, res: Response, next: NextFunction) => {
  const file = req.file; // nếu bạn dùng multer, file sẽ có trong req.file
  
  if (!file) {
    return res.status(400).send('No file uploaded.');
  }

  cloudinary.uploader.upload(file.path, (err, result) => {
    if (err) {
      return res.status(500).send('Error uploading to Cloudinary');
    }
    req.body.imageUrl = result?.secure_url; // Lưu URL hình ảnh vào request body
    next();
  });
};
