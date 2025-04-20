import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app';
import { connectDB } from './config/db';
import { setupSocket } from './socket';

const server = createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, methods: ['GET', 'POST'] }
});

setupSocket(io);  // Khởi tạo socket server

connectDB().then(() => {
  server.listen(process.env.PORT, () => {
    console.log(`🚀 Server started at http://localhost:${process.env.PORT}`);
  });
});
