const Game = require("./game");

class RoomManager {
  constructor() {
    this.games = {}; // Room ID -> Game
    this.users = {}; // User ID -> WebSocket
  }

  // Add a user and assign unique ID
  addUser(socket) {
    const userId = this.generateUserId();
    this.users[userId] = socket;
    this.addHandler(socket, userId);
  }

  removeUser(socket) {
    const userId = this.getUserIdBySocket(socket);
    if (userId) {
      delete this.users[userId]; // Remove user from users list
      this.handleDisconnect(userId); // Notify others of disconnection
    }
  }

  // Add message handlers for each socket
  addHandler(socket, userId) {
    socket.on("message", (data) => {
      const message = JSON.parse(data.toString());
      this.handleMessage(socket, userId, message);
    });
  }

  handleMessage(socket, userId, message) {
    // Handle room creation
    if (message.type === "CREATE_ROOM") {
      const roomId = this.createRoom(userId);
      socket.send(JSON.stringify({ type: "ROOM_CREATED", roomId }));
    }

    // Handle room joining
    if (message.type === "JOIN_ROOM") {
      const { roomId } = message;
      this.joinRoom(userId, roomId, socket);
    }

    // Handle player moves
    if (message.type === "MOVE") {
      const { roomId, move } = message;
      const game = this.games[roomId];
      if (game) {
        game.makeMove(userId, move);
      } else {
        socket.send(
          JSON.stringify({ type: "ERROR", message: "Room does not exist." })
        );
      }
    }
  }

  // Create a room
  createRoom(userId) {
    const roomId = this.generateRoomId(); // Generate unique room ID
    this.games[roomId] = new Game(userId); // Create new game instance
    return roomId;
  }

  // Join an existing room
  joinRoom(userId, roomId, socket) {
    const game = this.games[roomId];
    if (game) {
      game.addPlayer(userId, socket); // Add user to the game
    } else {
      socket.send(
        JSON.stringify({ type: "ERROR", message: "Room does not exist." })
      );
    }
  }

  // Handle disconnect notifications
  handleDisconnect(userId) {
    Object.values(this.games).forEach((game) => {
      if (game.hasPlayer(userId)) {
        game.notifyPlayers(`${userId} has disconnected.`);
        game.removePlayer(userId);

        // Check if the game is empty and remove it
        if (Object.keys(game.players).length === 0) {
          delete this.games[game.id]; // Optionally assign a unique ID for each game
        }
      }
    });
  }

  // Generate a unique user ID
  generateUserId() {
    return `user-${Date.now()}-${Math.random().toString(5).substring(2)}`;
  }

  // Generate a unique room ID
  generateRoomId() {
    return Math.floor(Math.random() * 10000);
  }

  // Get user ID by socket
  getUserIdBySocket(socket) {
    return Object.keys(this.users).find((key) => this.users[key] === socket);
  }
}

module.exports = RoomManager;
