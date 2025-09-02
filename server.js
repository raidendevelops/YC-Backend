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
  broadcastCount();

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === "chat") {
        // Broadcast chat message to all clients
        broadcast({
          type: "chat",
          from: data.from,
          text: data.text,
        });
      }
    } catch (err) {
      console.error("Invalid message:", err);
    }
  });

  ws.on("close", () => {
    onlineUsers = Math.max(onlineUsers - 1, 0);
    console.log("User disconnected:", onlineUsers);
    broadcastCount();
  });
});

function broadcastCount() {
  broadcast({ type: "count", count: onlineUsers });
}

function broadcast(data) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

// === Start the server ===
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`YeahChat backend is running 🚀 on port ${PORT}`);
});
