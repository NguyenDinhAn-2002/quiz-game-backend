import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Chỉ cần khi đăng ký thường
    avatar: { type: String },   // Có thể dùng ảnh Google
    provider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);
export default User;
