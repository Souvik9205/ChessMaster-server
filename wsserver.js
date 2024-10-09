const { WebSocketServer } = require("ws");
const RoomManager = require("./service/room-manager.js");
const port = process.env.PORT || 443;

const wss = new WebSocketServer({ port: port });
const roomManager = new RoomManager();

wss.on("connection", function connection(ws) {
  roomManager.addUser(ws);

  ws.on("close", () => roomManager.removeUser(ws));
});
console.log(`WebSocket server running on port ${port}`);
