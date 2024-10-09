const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");

const RoomManager = require("./service/room-manager.js");
const router = require("./routes/route.js");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const port = 8080;
const wss = new WebSocketServer({ port: process.env.PORT });
const roomManager = new RoomManager();

app.use(cors());
app.use(express.json());

app.use("/", router);

server.listen(port, () => {
  console.log(`listening on *:${port}`);
});

// Handle incoming connections
wss.on("connection", function connection(ws) {
  console.log("player connected");
  roomManager.addUser(ws);

  // Handle user disconnects
  ws.on("close", () => roomManager.removeUser(ws));
});
