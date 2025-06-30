import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app';
import { connectDB } from './config/db';
import { socketHandler } from './socket';

const server = createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'],
    credentials: true, }
});

socketHandler(io); // Khởi tạo socket server

connectDB().then(() => {
  server.listen(process.env.PORT, () => {
    console.log(`🚀 Server is running`);
  });
});
