const { Chess } = require("chess.js");

class Game {
  constructor(player1Id) {
    this.players = { [player1Id]: null }; // Player ID to socket mapping
    this.board = new Chess(); // Initialize the chess board
    this.moveCount = 0; // Move counter
  }

  // Add player to the game
  addPlayer(playerId, socket) {
    if (Object.keys(this.players).length < 2) {
      this.players[playerId] = socket;
      // Notify both players of the new player's color
      this.notifyPlayers(`${playerId} joined the game.`);
      if (Object.keys(this.players).length === 2) {
        this.startGame(); // Start the game once 2 players are present
      }
    } else {
      socket.send(JSON.stringify({ type: "ERROR", message: "Room is full." }));
    }
  }

  // Remove a player from the game
  removePlayer(playerId) {
    delete this.players[playerId];
    if (Object.keys(this.players).length === 0) {
      // Game ends if no players are left
      this.endGame();
    }
  }

  // Check if a player is in the game
  hasPlayer(playerId) {
    return this.players.hasOwnProperty(playerId);
  }

  // Start the game and notify players
  startGame() {
    const playerIds = Object.keys(this.players);
    Object.values(this.players).forEach((socket, index) => {
      const color = index === 0 ? "white" : "black";
      socket.send(JSON.stringify({ type: "INIT_GAME", color }));
    });

    // Store player ids for move validation
    this.player1Id = playerIds[0];
    this.player2Id = playerIds[1];
  }

  // Notify players with a message
  notifyPlayers(message) {
    Object.values(this.players).forEach((socket) => {
      if (socket) {
        socket.send(JSON.stringify({ type: "NOTIFICATION", message }));
      }
    });
  }

  // End the game logic
  endGame() {
    Object.values(this.players).forEach((socket) => {
      if (socket) {
        socket.send(
          JSON.stringify({ type: "GAME_ENDED", message: "Game has ended." })
        );
      }
    });
  }

  // Make a move
  makeMove(playerId, move) {
    const socket = this.players[playerId];

    // Check if the game is already over (checkmate or stalemate)
    if (this.board.isGameOver()) {
      socket.send(
        JSON.stringify({ type: "ERROR", message: "Game is already over." })
      );
      return;
    }

    // Ensure it's the correct player's turn
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
      // Attempt to make the move using chess.js
      const result = this.board.move(move);

      if (!result) {
        throw new Error("Invalid move");
      }

      // If the move was successful, check game over conditions
      if (this.board.isCheckmate()) {
        // Notify both players of checkmate
        Object.values(this.players).forEach((playerSocket) => {
          playerSocket.send(
            JSON.stringify({
              type: "GAME_OVER",
              payload: {
                winner: playerId === this.player1Id ? "white" : "black",
                reason: "checkmate",
              },
            })
          );
        });
        return;
      } else if (this.board.isDraw() || this.board.isStalemate()) {
        // Check for a draw or stalemate and notify players
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

      // If not game over, continue sending the move to the opponent
      const opponentId =
        playerId === this.player1Id ? this.player2Id : this.player1Id;
      this.players[opponentId].send(
        JSON.stringify({ type: "MOVE", payload: move })
      );

      this.moveCount++;
    } catch (e) {
      console.error(e.message);
      socket.send(JSON.stringify({ type: "ERROR", message: "Invalid move." }));
    }
  }

  // Check if it's the player's turn
  isPlayerTurn(playerId) {
    const currentPlayerId =
      this.moveCount % 2 === 0 ? this.player1Id : this.player2Id;
    return playerId === currentPlayerId;
  }

  // Notify players of a move
  notifyMove(playerId, move) {
    Object.values(this.players).forEach((socket) => {
      if (socket && socket !== this.players[playerId]) {
        socket.send(JSON.stringify({ type: "MOVE", move }));
      }
    });
  }
}

module.exports = Game;
