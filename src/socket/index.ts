
import { Server } from 'socket.io';

export const setupSocket = (io: Server) => {
  io.on('connection', (socket) => {
    console.log(`🟢 User connected: ${socket.id}`);

    socket.on('join-room', (roomId: string, playerName: string) => {
      socket.join(roomId);
      console.log(`${playerName} joined room ${roomId}`);

      // Gửi thông báo đến các người khác trong phòng
      socket.to(roomId).emit('player-joined', playerName);
    });

    socket.on('start-quiz', (roomId: string, quizData: any) => {
      io.to(roomId).emit('quiz-started', quizData);
    });

    socket.on('submit-answer', (roomId: string, data: any) => {
      socket.to(roomId).emit('player-answered', data);
    });

    socket.on('disconnect', () => {
      console.log(`🔴 User disconnected: ${socket.id}`);
    });
  });
};
