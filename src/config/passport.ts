import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/user.model';
import dotenv from 'dotenv';

dotenv.config();

export default function configurePassport(passport: passport.PassportStatic) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: 'http://localhost:5000/auth/google/callback', // URL để xử lý kết quả trả về từ Google
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Kiểm tra người dùng đã tồn tại chưa
          let user = profile.emails && profile.emails[0] 
            ? await User.findOne({ email: profile.emails[0].value }) 
            : null;
          if (!user) {
            // Nếu người dùng chưa tồn tại, tạo mới
            user = new User({
              name: profile.displayName,
              email: profile.emails?.[0]?.value || '',
              provider: 'google',
            });
            await user.save();
          }

          // Trả về thông tin người dùng (profile) sau khi đăng nhập
          return done(null, user);
        } catch (err) {
          return done(err, false);
        }
      }
    )
  );

  passport.serializeUser((user: any, done: any) => {
    done(null, user.id); // Serialize thông tin người dùng
  });

  passport.deserializeUser(async (id: any, done: any) => {
    const user = await User.findById(id); // Tìm người dùng trong database
    done(null, user);
  });
}
