//Tương tác real-time với client sử dụng Socket.IO
import { Server } from 'socket.io';

export default function initSocket(io: Server) {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', ({ pin }) => {
      socket.join(pin);
      socket.to(pin).emit('user_joined', { userId: socket.id });
    });
  });
}