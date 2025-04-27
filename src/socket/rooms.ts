
export const rooms: Record<
  string,
  {
    quizId: string;
    hostId: string;
    isStarted: boolean;
    currentQuestion: number;
    players: {
      socketId: string;
      name: string;
      avatar: string;
      score: number;
      isHost: boolean;
    }[];
  }
> = {};
