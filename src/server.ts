import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from './app';
import { connectDB } from './config/db';
import initSocket from './socket';

dotenv.config();

const server = createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, methods: ['GET', 'POST'] }
});

initSocket(io);

connectDB().then(() => {
  server.listen(process.env.PORT, () => {
    console.log(`🚀 Server started at http://localhost:${process.env.PORT}`);
  });
});