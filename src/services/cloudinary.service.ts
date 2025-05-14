
import { Request, Response, NextFunction } from 'express';
import cloudinary from '../config/cloudinary';
import streamifier from 'streamifier';
import { UploadedFile } from 'express-fileupload';

const streamUpload = (fileBuffer: Buffer): Promise<{ secure_url: string }> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'auto' },
      (error, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(error);
        }
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

export const uploadSingleFile = async (file: UploadedFile) => {
  const buffer = file.data;
  const uploaded = await streamUpload(buffer);
  return uploaded.secure_url;
};

export const uploadMultipleFiles = async (files: UploadedFile[] | UploadedFile) => {
  if (Array.isArray(files)) {
    return await Promise.all(files.map(file => uploadSingleFile(file)));
  } else {
    return [await uploadSingleFile(files)];
  }
};

export const uploadFromUrl = async (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      url, // URL của ảnh
      { resource_type: 'auto' },
      (error, result) => {
        if (result) {
          resolve(result.secure_url); // Trả về URL ảnh đã upload
        } else {
          reject(error);
        }
      }
    );
  });
};