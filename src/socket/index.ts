import { Server } from "socket.io";
import { rooms } from "./rooms";

export const socketHandler = (io: Server) => {
  io.on("connection", (socket) => {
    console.log("🔌 New connection:", socket.id);

    // ========== HOST TẠO PHÒNG ==========  
    socket.on("host-create-room", ({ quizId }, callback) => {
      const pin = Math.floor(100000 + Math.random() * 900000).toString(); // Tạo pin ngẫu nhiên

      rooms[pin] = {
        quizId,
        hostId: socket.id,
        isStarted: false,
        currentQuestion: 0,
        players: [],
      };

      socket.join(pin);
      console.log(`🏠 Room created: PIN ${pin} by Host (${socket.id})`);

      callback({ pin, hostId: socket.id }); // Gửi lại pin cho frontend
      io.to(pin).emit("room-updated", rooms[pin]); // Cập nhật phòng
    });

    // ========== NGƯỜI CHƠI JOIN PHÒNG ==========  
    socket.on("player-join-room", ({ pin, name, avatar }, callback) => {
      const room = rooms[pin];
      if (!room) {
        return callback({ error: "Room not found" });
      }

      if (room.isStarted) {
        return callback({ error: "Game already started. Cannot join now." });
      }

      const isNameTaken = room.players.some(p => p.name === name);
      if (isNameTaken) {
        return callback({ error: "Tên đã được sử dụng, hãy chọn tên khác." });
      }

      room.players.push({
        socketId: socket.id,
        name,
        avatar,
        score: 0,
        isHost: socket.id === room.hostId, // Xác định người host (nếu host tự join)
      });
      socket.join(pin);
      console.log(`🙋 Player ${name} joined Room ${pin}`);
      io.to(pin).emit("room-updated", room);
      callback({ success: true });
    });

    // (Các phần còn lại: start-game, submit-answer, next-question, kick-player, disconnect giữ nguyên như bạn đã viết)

    // ========== HOST BẮT ĐẦU GAME ==========
    socket.on("start-game", ({ pin }) => {
      const room = rooms[pin];
      if (room && socket.id === room.hostId) {
        room.isStarted = true;
        room.currentQuestion = 0;
        console.log(`▶️ Game started in Room ${pin}`);
        io.to(pin).emit("game-started", room);
      }
    });

    // ========== NGƯỜI CHƠI TRẢ LỜI ==========
    socket.on("submit-answer", ({ pin, correct }) => {
      const room = rooms[pin];
      if (!room) return;

      const player = room.players.find((p) => p.socketId === socket.id);
      if (player) {
        if (correct) {
          player.score += 1;
          console.log(`✅ ${player.name} đúng! Score: ${player.score}`);
        } else {
          console.log(`❌ ${player.name} sai.`);
        }
      }
    });

    // ========== CHUYỂN CÂU HỎI ==========
    socket.on("next-question", ({ pin }) => {
      const room = rooms[pin];
      if (room && socket.id === room.hostId) {
        room.currentQuestion += 1;
        console.log(`➡️ Next question ${room.currentQuestion} in Room ${pin}`);
        io.to(pin).emit("next-question", room.currentQuestion);
      }
    });

    // ========== KICK NGƯỜI CHƠI ==========
    socket.on("kick-player", ({ pin, targetSocketId }, callback) => {
      const room = rooms[pin];
      if (!room || socket.id !== room.hostId) {
        return callback?.({ error: "Bạn không có quyền." });
      }

      const index = room.players.findIndex(p => p.socketId === targetSocketId);
      if (index === -1) return callback?.({ error: "Người chơi không tồn tại." });

      const kickedPlayer = room.players[index];
      room.players.splice(index, 1);
      io.to(targetSocketId).emit("kicked");
      io.to(pin).emit("room-updated", room);
      console.log(`👞 ${kickedPlayer.name} bị kick khỏi Room ${pin}`);
      callback?.({ success: true });
    });

    // ========== NGẮT KẾT NỐI ==========
    socket.on("disconnect", () => {
      for (const pin in rooms) {
        const room = rooms[pin];
        const index = room.players.findIndex(p => p.socketId === socket.id);

        if (index !== -1) {
          const name = room.players[index].name;
          room.players.splice(index, 1);
          console.log(`❌ ${name} (${socket.id}) left Room ${pin}`);

          if (room.players.length === 0 && socket.id === room.hostId) {
            delete rooms[pin];
            console.log(`🗑️ Room ${pin} deleted (empty and no host)`);
          } else {
            io.to(pin).emit("room-updated", room);
          }
        }
      }
    });
  });
};
