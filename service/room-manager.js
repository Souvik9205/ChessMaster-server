const Game = require("./game");

class RoomManager {
  constructor() {
    this.games = {};
    this.users = {};
  }

  addUser(socket) {
    this.addHandler(socket);
  }
  removeUser(socket) {
    const username = this.getUserIdBySocket(socket);
    if (username) {
      delete this.users[username];
      this.handleDisconnect(username);
    }
  }
  addHandler(socket) {
    socket.on("message", (data) => {
      const message = JSON.parse(data.toString());

      if (message.type === "SET_USERNAME") {
        const username = message.username;
        const success = this.setUsername(socket, username);
        if (success) {
          socket.send(
            JSON.stringify({
              type: "USERNAME",
              message: `Welcome, ${username}`,
            })
          );
        } else {
          socket.send(
            JSON.stringify({
              type: "ERROR",
              message: "Username already in use.",
            })
          );
        }
        return;
      }

      const username = this.getUserIdBySocket(socket);
      if (username) {
        this.handleMessage(socket, username, message);
      }
    });
  }

  setUsername(socket, username) {
    if (this.users[username]) {
      return false;
    }
    this.users[username] = { socket, username };
    return true;
  }

  handleMessage(socket, username, message) {
    if (message.type === "CREATE_ROOM") {
      const roomId = this.createRoom(username);
      socket.send(JSON.stringify({ type: "ROOM_CREATED", roomId }));
    }

    if (message.type === "JOIN_ROOM") {
      const { id } = message;
      this.joinRoom(username, id, socket);
    }

    if (message.type === "MOVE") {
      const { roomId, move } = message;
      const game = this.games[roomId];
      if (game) {
        game.makeMove(username, move);
      } else {
        socket.send(
          JSON.stringify({ type: "ERROR", message: "Room does not exist." })
        );
      }
    }
  }

  createRoom(username) {
    const roomId = this.generateRoomId();
    this.games[roomId] = new Game(username);
    return roomId;
  }

  joinRoom(username, roomId, socket) {
    const game = this.games[roomId];
    if (game) {
      game.addPlayer(username, socket);
    } else {
      socket.send(
        JSON.stringify({ type: "ERROR", message: "Room does not exist." })
      );
    }
  }

  handleDisconnect(username) {
    Object.values(this.games).forEach((game) => {
      if (game.hasPlayer(username)) {
        game.disconnectPlayer(`${username} has disconnected.`);
        game.removePlayer(username);

        if (Object.keys(game.players).length === 0) {
          delete this.games[game.id];
        }
      }
    });
  }

  generateRoomId() {
    return Math.floor(Math.random() * 10000);
  }

  getUserIdBySocket(socket) {
    return Object.keys(this.users).find(
      (username) => this.users[username].socket === socket
    );
  }
}

module.exports = RoomManager;
