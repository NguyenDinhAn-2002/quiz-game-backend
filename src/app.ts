import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import dotenv from 'dotenv';
import routes from './routes';

import configurePassport from './config/passport';
configurePassport(passport);

dotenv.config();


const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
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
    // Thành công, chuyển hướng về trang chính hoặc gửi token
    res.redirect('/'); // Hoặc gửi token về frontend
  }
);

app.use('/api', routes);


export default app;