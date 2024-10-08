const { Chess } = require("chess.js");

class Game {
  constructor(player1Id) {
    this.players = { [player1Id]: null };
    this.board = new Chess();
    this.moveCount = 0;
  }

  addPlayer(playerId, socket) {
    if (Object.keys(this.players).length < 2) {
      this.players[playerId] = socket;
      this.notifyPlayers(`${playerId}`);
      if (Object.keys(this.players).length === 2) {
        this.startGame();
      }
    } else {
      socket.send(JSON.stringify({ type: "ERROR", message: "Room is full." }));
    }
  }

  removePlayer(playerId) {
    delete this.players[playerId];
    if (Object.keys(this.players).length === 0) {
      this.endGame();
    }
  }

  hasPlayer(playerId) {
    return this.players.hasOwnProperty(playerId);
  }

  startGame() {
    const playerIds = Object.keys(this.players);
    Object.values(this.players).forEach((socket, index) => {
      const color = index === 0 ? "white" : "black";
      socket.send(JSON.stringify({ type: "INIT_GAME", color }));
    });

    this.player1Id = playerIds[0];
    this.player2Id = playerIds[1];
  }

  notifyPlayers(message) {
    Object.values(this.players).forEach((socket) => {
      if (socket) {
        socket.send(JSON.stringify({ type: "NOTIFICATION", message }));
      }
    });
  }
  disconnectPlayer(message) {
    Object.values(this.players).forEach((socket) => {
      if (socket) {
        socket.send(JSON.stringify({ type: "DISCONNECT", message }));
      }
    });
  }

  endGame() {
    Object.values(this.players).forEach((socket) => {
      if (socket) {
        socket.send(
          JSON.stringify({ type: "GAME_ENDED", message: "Game has ended." })
        );
      }
    });
  }

  makeMove(playerId, move) {
    const socket = this.players[playerId];

    if (this.board.isGameOver()) {
      socket.send(
        JSON.stringify({ type: "ERROR", message: "Game is already over." })
      );
      return;
    }

    if (
      (this.moveCount % 2 === 0 && playerId !== this.player1Id) ||
      (this.moveCount % 2 === 1 && playerId !== this.player2Id)
    ) {
      socket.send(
        JSON.stringify({ type: "ERROR", message: "It's not your turn." })
      );
      return;
    }

    try {
      const result = this.board.move(move);

      if (!result) {
        throw new Error("Invalid move");
      }
      const senderId =
        playerId === this.player1Id ? this.player1Id : this.player2Id;
      this.notifyMove(senderId, move);

      if (this.board.isCheckmate()) {
        Object.values(this.players).forEach((playerSocket) => {
          playerSocket.send(
            JSON.stringify({
              type: "GAME_OVER",
              payload: {
                winner:
                  playerId === this.player1Id ? this.player1Id : this.player2Id,
                reason: "checkmate",
              },
            })
          );
        });
        return;
      } else if (this.board.isDraw() || this.board.isStalemate()) {
        Object.values(this.players).forEach((playerSocket) => {
          playerSocket.send(
            JSON.stringify({
              type: "GAME_OVER",
              payload: {
                winner: null,
                reason: "draw",
              },
            })
          );
        });
        return;
      }

      this.moveCount++;
    } catch (e) {
      console.error(e.message);
      socket.send(JSON.stringify({ type: "ERROR", message: "Invalid move." }));
    }
  }

  isPlayerTurn(playerId) {
    const currentPlayerId =
      this.moveCount % 2 === 0 ? this.player1Id : this.player2Id;
    return playerId === currentPlayerId;
  }

  notifyMove(playerId, move) {
    Object.values(this.players).forEach((socket) => {
      if (socket) {
        socket.send(JSON.stringify({ type: "MOVE", user: playerId, move }));
      }
    });
  }
}

module.exports = Game;
