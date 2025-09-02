import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import cors from "cors";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());

let onlineUsers = 0;

wss.on("connection", (ws) => {
  onlineUsers++;
  console.log("User connected:", onlineUsers);

  // notify all clients
  broadcastCount();

  ws.on("close", () => {
    onlineUsers = Math.max(onlineUsers - 1, 0);
    console.log("User disconnected:", onlineUsers);
    broadcastCount();
  });
});

function broadcastCount() {
  const message = JSON.stringify({ type: "count", count: onlineUsers });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

app.get("/", (req, res) => {
  res.send("YeahChat backend is running 🚀");
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`YeahChat backend running on port ${PORT}`);
});
