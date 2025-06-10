import { Server, Socket } from "socket.io";

interface Player {
  id: string;
  name: string;
  score: number;
  answered: boolean;
  answer: any;
  isHost: boolean;
  isConnected: boolean;
  avatar?: string;
}

interface Room {
  id: string;
  hostId: string;
  players: Map<string, Player>;
  quizData: any;
  currentQuestionIndex: number;
  questionTimer: NodeJS.Timeout | null;
  questionStartTime: number;
  questionTimeLimit: number;
  paused: boolean;
  pausedTime: number;
  questionEnded: boolean;
  isStarted: boolean;
}

const rooms = new Map<string, Room>();
const playerToRoom = new Map<string, string>();
const socketIdToPlayerId = new Map<string, string>();

// Periodic cleanup: remove rooms when all players disconnected for 5 minutes
setInterval(() => {
  const now = Date.now();
  rooms.forEach((room, roomId) => {
    const allDisconnected = Array.from(room.players.values()).every(
      (p) => !p.isConnected
    );
    if (allDisconnected && now - room.questionStartTime > 5 * 60 * 1000) {
      // Clean up mappings
      playerToRoom.forEach((rId, sockId) => {
        if (rId === roomId) playerToRoom.delete(sockId);
      });
      socketIdToPlayerId.forEach((pId, sockId) => {
        if (room.players.has(pId)) socketIdToPlayerId.delete(sockId);
      });
      rooms.delete(roomId);
      console.log(`🧽 Room ${roomId} cleaned up due to inactivity`);
    }
  });
}, 60 * 1000);

export const socketHandler = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log("🟢 Client connected:", socket.id);

    //
    // Host creates a new room
    //
    socket.on("create-room", ({ hostId, quizData }) => {
      const roomId = generateRoomId();
      console.log(`📦 Host ${hostId} created room: ${roomId}`);

      const newRoom: Room = {
        id: roomId,
        hostId,
        players: new Map(),
        quizData,
        currentQuestionIndex: 0,
        questionTimer: null,
        questionStartTime: Date.now(),
        questionTimeLimit: 20,
        paused: false,
        pausedTime: 0,
        questionEnded: false,
        isStarted: false,
      };

      rooms.set(roomId, newRoom);

      socket.join(roomId);
      playerToRoom.set(socket.id, roomId);
      socketIdToPlayerId.set(socket.id, hostId);

      io.to(roomId).emit("room-updated", serializeRoom(newRoom));
    });

    //
    // Host reconnects (without having joined as a player yet)
    //
    socket.on("host-reconnect", ({ roomId, hostId }) => {
      const room = rooms.get(roomId);
      if (!room) {
        return socket.emit("error", "Room not found");
      }
      socket.join(roomId);
      socketIdToPlayerId.set(socket.id, hostId);
      playerToRoom.set(socket.id, roomId);

      console.log(`🔁 Host ${hostId} reconnected to room ${roomId}`);
      io.to(roomId).emit("room-updated", serializeRoom(room));

      // If game is already in progress and the question has not ended, send current question
      if (room.isStarted && !room.questionEnded) {
        socket.emit("new-question", {
          question: room.quizData.questions[room.currentQuestionIndex],
          index: room.currentQuestionIndex,
          timeLimit: room.questionTimeLimit,
          questionStartTime: room.questionStartTime,
        });
      }
    });

    //
    // Player joins or reconnects to a room
    //
    socket.on("join-room", ({ roomId, player }) => {
      const room = rooms.get(roomId);
      if (!room) {
        console.log(`❌ Player ${player.name} tried to join nonexistent room ${roomId}`);
        return socket.emit("error", "Room not found");
      }

      // Map socket ↔ room, socket ↔ player
      playerToRoom.set(socket.id, roomId);
      socketIdToPlayerId.set(socket.id, player.id);

      const existingPlayer = room.players.get(player.id);
      if (existingPlayer) {
        // Reconnect existing player
        existingPlayer.isConnected = true;
        existingPlayer.name = player.name;
        existingPlayer.isHost = player.id === room.hostId;
        existingPlayer.avatar = player.avatar;

        socket.join(roomId);
        console.log(`🔁 Player ${player.name} (id:${player.id}) reconnected to room ${roomId}`);
        io.to(roomId).emit("room-updated", serializeRoom(room));

        // If game in progress and question not ended, send current question info to this socket
        if (room.isStarted && !room.questionEnded) {
          socket.emit("new-question", {
            question: room.quizData.questions[room.currentQuestionIndex],
            index: room.currentQuestionIndex,
            timeLimit: room.questionTimeLimit,
            questionStartTime: room.questionStartTime,
          });
        }
        return;
      }

      // New player
      const isHost = player.id === room.hostId;
      const newPlayer: Player = {
        id: player.id,
        name: player.name,
        isHost,
        score: 0,
        answered: false,
        answer: null,
        isConnected: true,
        avatar: player.avatar,
      };

      // If game already started, reject join
      if (room.isStarted) {
        console.log(`❌ Player ${player.name} tried to join after game started in room ${roomId}`);
        playerToRoom.delete(socket.id);
        socketIdToPlayerId.delete(socket.id);
        return socket.emit("error", "Game already started");
      }

      room.players.set(player.id, newPlayer);
      socket.join(roomId);
      console.log(`👥 Player ${player.name} (id:${player.id}, isHost:${isHost}) joined room ${roomId}`);

      io.to(roomId).emit("room-updated", serializeRoom(room));
    });

    //
    // Host starts the game
    //
    socket.on("start-game", ({ roomId, playerId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      if (playerId !== room.hostId) {
        return socket.emit("error", "Chỉ host mới được bắt đầu game");
      }

      console.log(`🚀 Starting game in room: ${roomId}`);
      room.isStarted = true;
      room.currentQuestionIndex = 0;
      room.questionEnded = false;
      room.questionStartTime = Date.now();
      sendQuestion(io, roomId);
    });

    //
    // Player submits an answer
    //
    socket.on("submit-answer", ({ playerId, answer }) => {
      const roomId = playerToRoom.get(socket.id);
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room || room.questionEnded) return;

      const player = room.players.get(playerId);
      if (!player || player.answered) return;

      player.answered = true;
      player.answer = answer;

      const question = room.quizData.questions[room.currentQuestionIndex];
      if (!question) return;

      // Determine answerForScoring
      let answerForScoring: any;
      switch (question.questionType) {
        case "single":
          answerForScoring = answer.answerId || answer;
          break;
        case "multiple":
          answerForScoring = answer.options || answer;
          break;
        case "order":
          answerForScoring = answer.options || answer;
          break;
        case "input":
          const rawAnswer = typeof answer === "string" ? answer : answer.answerId || "";
          answerForScoring = rawAnswer
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
          break;
        default:
          answerForScoring = answer;
      }

      const timeTaken = Date.now() - room.questionStartTime;
      const timeLimitMs = room.questionTimeLimit * 1000;
      const baseScore = calculateScore(question, answerForScoring);

      // Speed bonus
      const maxSpeedBonus = 5;
      let speedScore = 0;
      if (timeTaken < timeLimitMs && baseScore > 0) {
        speedScore = Math.round(((timeLimitMs - timeTaken) / timeLimitMs) * maxSpeedBonus);
      }

      const totalScore = baseScore + speedScore;
      player.score += totalScore;

      console.log(
        `📝 ${player.name} answered | Correct: ${baseScore > 0} | SpeedBonus: +${speedScore} | Total: +${totalScore}`
      );

      const isCorrect = baseScore > 0;
      const resultText = isCorrect ? "Đúng" : "Sai";

      // Send result back to the answering socket
      io.to(socket.id).emit("answer-result", {
        result: resultText,
        score: totalScore,
        correctAnswer: getCorrectAnswerIds(question),
        playerAnswer: answer,
      });

      // If all have answered, end the question immediately
      const allAnswered = Array.from(room.players.values()).every((p) => p.answered);
      if (allAnswered) {
        if (room.questionTimer) {
          clearTimeout(room.questionTimer);
          room.questionTimer = null;
        }
        endQuestion(io, roomId);
      }
    });

    //
    // Host goes to next question
    //
    socket.on("next-question", ({ roomId, playerId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      if (playerId !== room.hostId) {
        return socket.emit("error", "Chỉ host mới được chuyển câu hỏi");
      }

      room.currentQuestionIndex++;
      sendQuestion(io, roomId);
    });

    //
    // Host pauses the game
    //
    socket.on("pause-game", ({ roomId, playerId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      if (playerId !== room.hostId) {
        return socket.emit("error", "Chỉ host mới có thể tạm dừng game");
      }

      if (room.paused) {
        return socket.emit("error", "Game đã tạm dừng");
      }

      if (room.questionTimer) {
        clearTimeout(room.questionTimer);
        room.questionTimer = null;

        const elapsedTime = Date.now() - room.questionStartTime;
        room.pausedTime = elapsedTime;
        room.paused = true;

        console.log(`⏸️ Game paused in room ${roomId}`);
        io.to(roomId).emit("pause-game");
      }
    });

    //
    // Host resumes the game
    //
    socket.on("resume-game", ({ roomId, playerId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      if (playerId !== room.hostId) {
        return socket.emit("error", "Chỉ host mới có thể tiếp tục game");
      }

      if (!room.paused) {
        return socket.emit("error", "Game chưa bị tạm dừng");
      }

      room.paused = false;
      const timeLeft = room.questionTimeLimit * 1000 - room.pausedTime;
      if (timeLeft <= 0) {
        endQuestion(io, roomId);
        return;
      }

      room.questionStartTime = Date.now() - room.pausedTime;
      room.questionTimer = setTimeout(() => {
        endQuestion(io, roomId);
      }, timeLeft);

      console.log(`▶️ Game resumed in room ${roomId}`);
      io.to(roomId).emit("resume-game", {
        remainingTime: Math.ceil(timeLeft / 1000),
      });
    });

    //
    // Player (or host-as-player) leaves the room
    //
    socket.on("leave-room", () => {
      const roomId = playerToRoom.get(socket.id);
      if (!roomId) return;

      const playerId = socketIdToPlayerId.get(socket.id);
      if (!playerId) return;

      const room = rooms.get(roomId);
      if (!room) return;

      const isHostLeaving = playerId === room.hostId;

      // If host hasn't joined as a player, they just leave the socket namespace
      if (!room.players.has(playerId)) {
        playerToRoom.delete(socket.id);
        socketIdToPlayerId.delete(socket.id);
        socket.leave(roomId);

        // If no players remain, delete the room
        if (room.players.size === 0) {
          rooms.delete(roomId);
          console.log(`🧹 Deleted room ${roomId} because host left before any player joined`);
        }
        return;
      }

      // Remove the player from the room
      room.players.delete(playerId);
      playerToRoom.delete(socket.id);
      socketIdToPlayerId.delete(socket.id);
      socket.leave(roomId);
      console.log(`🚪 Player ${playerId} left room ${roomId}`);

      if (room.players.size === 0) {
        // Clean up mappings
        playerToRoom.forEach((rId, sockId) => {
          if (rId === roomId) playerToRoom.delete(sockId);
        });
        socketIdToPlayerId.forEach((pId, sockId) => {
          if (room.players.has(pId)) socketIdToPlayerId.delete(sockId);
        });

        rooms.delete(roomId);
        console.log(`🧹 Deleted room ${roomId} because no players remain`);
      } else {
        if (isHostLeaving) {
          // Transfer host to the first remaining player
          const newHost = Array.from(room.players.values())[0];
          if (newHost) {
            room.hostId = newHost.id;
            newHost.isHost = true;
            console.log(`👑 Transferred host to: ${newHost.name}`);
          }
        }
        io.to(roomId).emit("room-updated", serializeRoom(room));
      }
    });

    //
    // Host kicks a player
    //
    socket.on("kick-player", ({ roomId, targetPlayerId, requesterId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      if (room.hostId !== requesterId) {
        return socket.emit("error", "Only host can kick players");
      }

      if (!room.players.has(targetPlayerId)) return;

      room.players.delete(targetPlayerId);

      // Clean up mappings and notify kicked socket
      for (const [sockId, playerId] of socketIdToPlayerId.entries()) {
        if (playerId === targetPlayerId) {
          socketIdToPlayerId.delete(sockId);
          playerToRoom.delete(sockId);
          io.sockets.sockets.get(sockId)?.leave(roomId);
          io.to(sockId).emit("player-kicked", { playerId: targetPlayerId });
        }
      }

      io.to(roomId).emit("room-updated", serializeRoom(room));
      console.log(`🥾 Player ${targetPlayerId} was kicked from room ${roomId}`);
    });

    //
    // Handle disconnection
    //
    socket.on("disconnect", () => {
      const roomId = playerToRoom.get(socket.id);
      if (!roomId) return;

      const playerId = socketIdToPlayerId.get(socket.id);
      if (!playerId) return;

      const room = rooms.get(roomId);
      if (!room) return;

      const player = room.players.get(playerId);
      if (player) {
        player.isConnected = false;
        console.log(`🔌 ${player.name} (id:${player.id}) disconnected from room ${roomId}`);
      }

      playerToRoom.delete(socket.id);
      socketIdToPlayerId.delete(socket.id);

      io.to(roomId).emit("room-updated", serializeRoom(room));
    });
  });
};

// --- Helper functions ---

function generateRoomId(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function serializeRoom(room: Room) {
  const hostPlayer = room.players.get(room.hostId);
  return {
    id: room.id,
    hostId: room.hostId,
    isStarted: room.isStarted,
    paused: room.paused,
    currentQuestionIndex: room.currentQuestionIndex,
    questionTimeLimit: room.questionTimeLimit,
    questionStartTime: room.questionStartTime,
    players: Array.from(room.players.values()),
    quizData: room.quizData,
    host: hostPlayer || {
      id: room.hostId,
      isHost: true,
      isConnected: false,
      name: "Host (chưa tham gia)",
      score: 0,
      answered: false,
      answer: null,
    },
  };
}

function sendQuestion(io: Server, roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  if (room.currentQuestionIndex >= room.quizData.questions.length) {
    io.to(roomId).emit("game-ended", {
      finalLeaderboard: Array.from(room.players.values()).map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        totalScore: p.score,
      })),
    });
    return;
  }

  const question = room.quizData.questions[room.currentQuestionIndex];

  // Reset player states
  room.players.forEach((p) => {
    p.answered = false;
    p.answer = null;
  });

  room.questionStartTime = Date.now();
  room.questionEnded = false;

  if (room.questionTimer) {
    clearTimeout(room.questionTimer);
    room.questionTimer = null;
  }

  room.questionTimer = setTimeout(() => {
    if (!room.paused) {
      endQuestion(io, roomId);
    }
  }, room.questionTimeLimit * 1000);

  io.to(roomId).emit("new-question", {
    question,
    index: room.currentQuestionIndex,
    timeLimit: room.questionTimeLimit,
    questionStartTime: room.questionStartTime,
  });
}

function endQuestion(io: Server, roomId: string) {
  const room = rooms.get(roomId);
  if (!room || room.questionEnded) return;

  room.questionEnded = true;

  if (room.questionTimer) {
    clearTimeout(room.questionTimer);
    room.questionTimer = null;
  }

  const currentQuestion = room.quizData.questions[room.currentQuestionIndex];
  if (!currentQuestion) return;

  const players = Array.from(room.players.values());
  const results = players.map((player) => ({
    playerId: player.id,
    name: player.name,
    avatar: player.avatar,
    answer: player.answer,
    score: player.score,
  }));

  console.log(`📊 Question ${room.currentQuestionIndex} ended in room ${roomId}`);

  io.to(roomId).emit("question-ended", {
    results,
    correctAnswer: getCorrectAnswerIds(currentQuestion),
    index: room.currentQuestionIndex,
  });

  // Wait 3 seconds for temporary leaderboard, then send full scoreboard
  setTimeout(() => {
    io.to(roomId).emit("scoreboard", {
      players: results,
    });

    // After 5 more seconds, move to next question
    setTimeout(() => {
      room.currentQuestionIndex++;
      sendQuestion(io, roomId);
    }, 5000);
  }, 3000);
}

function calculateScore(question: any, playerAnswer: any): number {
  if (!question || !question.options || question.options.length === 0) return 0;
  if (playerAnswer === null || playerAnswer === undefined || playerAnswer === "") return 0;

  const type = question.questionType;
  if (type === "single") {
    const correctAnswer = question.options.find((a: any) => a.isCorrect);
    return correctAnswer && playerAnswer === correctAnswer._id ? 10 : 0;
  }
  if (type === "multiple") {
    let score = 0;
    question.options.forEach((a: any) => {
      if (a.isCorrect && playerAnswer.includes(a._id)) score += 5;
      if (!a.isCorrect && playerAnswer.includes(a._id)) score -= 2;
    });
    return Math.max(score, 0);
  }
  if (type === "order") {
    const correctOrder = question.options.map((a: any) => a._id);
    return arraysEqual(playerAnswer, correctOrder) ? 10 : 0;
  }
  if (type === "input") {
    const correctAnswers = question.options
      .filter((a: any) => a.isCorrect)
      .map((a: any) =>
        a.text
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim()
      );
    return correctAnswers.includes(playerAnswer) ? 10 : 0;
  }
  return 0;
}

function arraysEqual(a: any[], b: any[]) {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

function getCorrectAnswerIds(question: any): string[] {
  if (!question || !Array.isArray(question.options)) return [];
  if (question.questionType === "input") {
    return question.options
      .filter((a: any) => a.isCorrect)
      .map((a: any) => a.text);
  }
  return question.options
    .filter((a: any) => a.isCorrect)
    .map((a: any) => a._id);
}
