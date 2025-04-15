import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';

dotenv.config();

export default function configurePassport(passport: passport.PassportStatic) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: 'http://localhost:5000/auth/google/callback',
      },
      (accessToken, refreshToken, profile, done) => {
        // Handle profile here, e.g. save to database or return user
        return done(null, profile);
      }
    )
  );

  (passport as any).serializeUser((user: any, done: any) => {
    done(null, user);
  });
  
  (passport as any).deserializeUser((user: any, done: any) => {
    done(null, user);
  });
  
}
