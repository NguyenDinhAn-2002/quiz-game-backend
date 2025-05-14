import { Server } from "socket.io";
import { rooms } from "./rooms";

// Biến lưu timeout xóa phòng sau khi host disconnect
const roomDeletionTimeouts: { [pin: string]: NodeJS.Timeout } = {};
const playerDisconnectTimeouts: { [socketId: string]: NodeJS.Timeout } = {};

const DISCONNECT_TIMEOUT = 15000; // 15 giây chờ reconnect

export const socketHandler = (io: Server) => {
  io.on("connection", (socket) => {
    console.log("🔌 New connection:", socket.id);

    // ========== HOST TẠO PHÒNG ==========
    socket.on("host-create-room", ({ quizId }, callback) => {
      const pin = Math.floor(100000 + Math.random() * 900000).toString();

      rooms[pin] = {
        quizId,
        hostId: socket.id,
        isStarted: false,
        currentQuestion: 0,
        players: [],
      };

      socket.join(pin);
      console.log(`🏠 Room created: PIN ${pin} by Host (${socket.id})`);

      callback({ pin, hostId: socket.id });
      io.to(pin).emit("room-updated", rooms[pin]);
    });

    // ========== NGƯỜI CHƠI JOIN PHÒNG ==========

socket.on("player-join-room", ({ pin, name, avatar }, callback) => {
  const room = rooms[pin];
  if (!room) return callback({ error: "Room not found" });

  if (room.isStarted) return callback({ error: "Game already started. Cannot join now." });

  // const isNameTaken = room.players.some(p => p.name === name);
  // if (isNameTaken) return callback({ error: "Tên đã được sử dụng, hãy chọn tên khác." });

  room.players.push({
    socketId: socket.id,
    name,
    avatar,
    score: 0,
    isHost: socket.id === room.hostId,
    isConnected: true, // ✅ Trạng thái kết nối online
  });

  socket.join(pin);
  console.log(`🙋 Player ${name} joined Room ${pin}`);
  io.to(pin).emit("room-updated", room); // Cập nhật trạng thái phòng cho tất cả người chơi
  callback({ success: true });
});


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

    // ========== TẠM DỪNG GAME ==========
    socket.on("pause-game", ({ pin, isPaused }) => {
      const room = rooms[pin];
      if (!room || socket.id !== room.hostId) return;

      console.log(`⏸️ Game in Room ${pin} is now ${isPaused ? "paused" : "resumed"}`);
      io.to(pin).emit("game-paused", isPaused);
    });

    // ========== NGƯỜI CHƠI TRẢ LỜI ==========
    socket.on("submit-answer", ({ pin, correct }) => {
      const room = rooms[pin];
      if (!room) return;

      const player = room.players.find(p => p.socketId === socket.id);
      if (player) {
        if (correct) player.score += 1;
        console.log(`📝 ${player.name} (${socket.id}) answered in Room ${pin}`);
        io.to(pin).emit("room-updated", room);
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
      if (!room || socket.id !== room.hostId) return callback?.({ error: "Bạn không có quyền." });

      const index = room.players.findIndex(p => p.socketId === targetSocketId);
      if (index === -1) return callback?.({ error: "Người chơi không tồn tại." });

      const kickedPlayer = room.players[index];
      room.players.splice(index, 1);
      io.to(targetSocketId).emit("kicked");
      io.to(pin).emit("room-updated", room);
      console.log(`👞 ${kickedPlayer.name} bị kick khỏi Room ${pin}`);
      callback?.({ success: true });
    });

    // ========== RỜI PHÒNG ==========
    socket.on("leave-room", ({ pin }, callback) => {
      const room = rooms[pin];
      if (!room) return;

      const index = room.players.findIndex(p => p.socketId === socket.id);
      if (index !== -1) {
        const name = room.players[index].name;
        room.players.splice(index, 1);
        console.log(`🚪 ${name} (${socket.id}) left Room ${pin}`);
        io.to(pin).emit("room-updated", room);
      }

      if (room.players.length === 0 && socket.id === room.hostId) {
        delete rooms[pin];
        console.log(`🗑️ Room ${pin} deleted (empty and no host)`);
      }
    });

    // ========== NGẮT KẾT NỐI ==========

socket.on("disconnect", () => {
  for (const pin in rooms) {
    const room = rooms[pin];
    const player = room.players.find(p => p.socketId === socket.id);

    if (player) {
      player.isConnected = false; // Đánh dấu player là đã mất kết nối
      console.log(`⚠️ Player ${player.name} temporarily disconnected from Room ${pin}`);
      io.to(pin).emit("room-updated", room);  // Cập nhật trạng thái phòng cho tất cả người chơi
    }

    if (room.hostId === socket.id) {
      console.log(`⏳ Host disconnected from Room ${pin}, waiting for reconnection...`);
      // Giữ timeout cho host và player để reconnect
      if (!roomDeletionTimeouts[pin]) {
        roomDeletionTimeouts[pin] = setTimeout(() => {
          if (rooms[pin]) {
            console.log(`🗑️ Room ${pin} deleted due to host not reconnecting in time.`);
            delete rooms[pin];
            delete roomDeletionTimeouts[pin];
          }
        }, 10000); // 10 giây chờ reconnect
      }
    }
  }
});


    // ========== HOST RECONNECT ==========

socket.on("host-reconnect", ({ pin, oldSocketId }) => {
  const room = rooms[pin];
  if (!room) {
    console.warn(`❗Reconnection failed: Room ${pin} not found`);
    return;
  }

  if (room.hostId === oldSocketId) {
    room.hostId = socket.id;  // Cập nhật hostId mới
    socket.join(pin);
    console.log(`🔄 Host reconnected to Room ${pin} with new socket: ${socket.id}`);

    if (roomDeletionTimeouts[pin]) {
      clearTimeout(roomDeletionTimeouts[pin]);
      delete roomDeletionTimeouts[pin];
      console.log(`✅ Room ${pin} preserved — host reconnected in time`);
    }

    io.to(pin).emit("room-updated", room);  // Cập nhật tất cả người chơi về thông tin phòng mới
  } else {
    console.warn(`⚠️ Mismatched host socket for Room ${pin}`);
  }
});

    // ========== PLAYER RECONNECT ==========

socket.on("player-reconnect", ({ pin, oldSocketId, name, avatar }) => {
  const room = rooms[pin];
  if (!room) {
    console.warn(`❗Reconnection failed: Room ${pin} not found`);
    return;
  }

  const player = room.players.find(p => p.socketId === oldSocketId);
  if (player) {
    player.socketId = socket.id;  // Cập nhật socketId mới cho người chơi
    player.isConnected = true;     // Đánh dấu người chơi là đã kết nối lại
    socket.join(pin);
    console.log(`🔄 Player ${name} reconnected to Room ${pin} with socket: ${socket.id}`);
    io.to(pin).emit("room-updated", room);  // Cập nhật tất cả người chơi về trạng thái phòng
  } else {
    console.warn(`⚠️ Player ${name} not found in Room ${pin}. Reconnection ignored.`);
  }
});

  });
};
