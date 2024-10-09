const express = require("express");
const http = require("http");

const router = require("./routes/route.js");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const port = 8080;

app.use(cors());
app.use(express.json());

app.use("/", router);

server.listen(port, () => {
  console.log(`listening on *:${port}`);
});
