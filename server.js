import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Helpers for file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const usersFile = path.join(__dirname, "users.json");

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// Ensure users.json exists
if (!fs.existsSync(usersFile)) {
  fs.writeFileSync(usersFile, JSON.stringify([]));
}

let onlineUsers = 0;

// ========== WEBSOCKETS ==========
wss.on("connection", (ws) => {
  onlineUsers++;
  console.log("✅ User connected:", onlineUsers);
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

      if (data.type === "typing") {
        broadcast({
          type: "typing",
          from: data.from,
        });
      }
    } catch (err) {
      console.error("❌ Invalid message:", err);
    }
  });

  ws.on("close", () => {
    onlineUsers = Math.max(onlineUsers - 1, 0);
    console.log("👋 User disconnected:", onlineUsers);
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

// ========== AUTH ROUTES ==========

// Signup
app.post("/signup", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  let users = JSON.parse(fs.readFileSync(usersFile, "utf-8"));

  if (users.find((u) => u.username === username)) {
    return res.status(400).json({ error: "User already exists" });
  }

  // Basic base64 encoding (for now, not secure)
  const encodedPassword = Buffer.from(password).toString("base64");

  users.push({ username, password: encodedPassword });
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

  res.json({ success: true, message: "User created" });
});

// Login
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  let users = JSON.parse(fs.readFileSync(usersFile, "utf-8"));
  const user = users.find((u) => u.username === username);

  if (!user) {
    return res.status(400).json({ error: "User not found" });
  }

  const encodedPassword = Buffer.from(password).toString("base64");

  if (user.password !== encodedPassword) {
    return res.status(400).json({ error: "Invalid password" });
  }

  res.json({ success: true, message: "Login successful" });
});

// ========== FALLBACK ==========
app.get("/", (req, res) => {
  res.send("✅ YeahChat backend is running");
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 YeahChat backend running on port ${PORT}`);
});
