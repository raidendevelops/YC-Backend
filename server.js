import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// __dirname workaround (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json()); // parse JSON bodies

// users.json file path
const USERS_FILE = path.join(__dirname, "users.json");

// Ensure users.json exists
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, "[]", "utf-8");
}

// Helpers to read/write users
function readUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, "utf-8");
    return JSON.parse(data || "[]");
  } catch (err) {
    console.error("Error reading users.json:", err);
    return [];
  }
}

function writeUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing users.json:", err);
  }
}

// --- AUTH ROUTES ---

// Signup
app.post("/signup", (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const users = readUsers();
    if (users.find((u) => u.username === username)) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const encodedPass = Buffer.from(password).toString("base64");
    users.push({ username, password: encodedPass });
    writeUsers(users);

    return res.json({ success: true, message: "User created" });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Login
app.post("/login", (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const users = readUsers();
    const user = users.find((u) => u.username === username);
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const encodedPass = Buffer.from(password).toString("base64");
    if (encodedPass !== user.password) {
      return res.status(401).json({ error: "Invalid password" });
    }

    return res.json({ success: true, message: "Login successful" });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// --- HEALTH CHECK ---
app.get("/health", (req, res) => res.json({ ok: true }));

// --- ERROR HANDLING ---
app.use((err, req, res, next) => {
  console.error("UNHANDLED ERROR:", err);
  res.status(500).json({ error: "Internal server error" });
});

// --- WEBSOCKETS ---
let onlineUsers = 0;

wss.on("connection", (ws) => {
  onlineUsers++;
  console.log("User connected:", onlineUsers);
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
      console.error("Invalid WS message:", err);
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

// --- START SERVER ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 YeahChat backend running on port ${PORT}`);
});
