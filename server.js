import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import cors from "cors";
import fs from "fs";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

const USERS_FILE = "./users.json";

// Load or create users file
let users = {};
if (fs.existsSync(USERS_FILE)) {
  users = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
} else {
  fs.writeFileSync(USERS_FILE, JSON.stringify({}));
}

// Helper: fake “hashing” with base64
function encodePassword(password) {
  return Buffer.from(password).toString("base64");
}

// === Signup endpoint ===
app.post("/signup", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Missing fields" });
  if (users[username]) return res.status(400).json({ error: "Username taken" });

  users[username] = { password: encodePassword(password) };
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  res.json({ success: true });
});

// === Login endpoint ===
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Missing fields" });

  const user = users[username];
  if (!user) return res.status(400).json({ error: "User not found" });

  if (encodePassword(password) !== user.password) {
    return res.status(400).json({ error: "Invalid password" });
  }

  res.json({ success: true });
});

// === WebSocket logic ===
let onlineUsers = 0;

wss.on("connection", (ws) => {
  onlineUsers++;
  broadcastCount();

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === "chat") {
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`YeahChat backend is running 🚀 on port ${PORT}`);
});
