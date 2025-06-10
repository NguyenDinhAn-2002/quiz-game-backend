import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import dotenv from 'dotenv';
import routes from './routes';
import fileUpload from 'express-fileupload';
import jwt from 'jsonwebtoken';

import configurePassport from './config/passport';

configurePassport(passport);

dotenv.config();


const app = express();

// app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(cors({
  origin: true, // Cho phép mọi origin
  credentials: true // Cho phép gửi cookie/session
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 
app.use(fileUpload({ useTempFiles: false })); 
app.use(session({
    secret: process.env.SESSION_SECRET || 'default-secret', 
    resave: false,
    saveUninitialized: false
  }));
  
app.use(passport.initialize());
app.use(passport.session());
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Callback URL khi Google trả về kết quả
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    const user = req.user as any;
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
    
    res.redirect(`${process.env.CLIENT_URL}/auth-success?token=${token}`);
  }
);

app.use('/api', routes);

  

export default app;