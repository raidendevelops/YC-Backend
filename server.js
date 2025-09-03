import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// Resolve file path for users.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const usersFile = path.join(__dirname, "users.json");

// helper: read users.json
function readUsers() {
  if (!fs.existsSync(usersFile)) return [];
  const data = fs.readFileSync(usersFile, "utf-8");
  return JSON.parse(data || "[]");
}

// helper: write users.json
function writeUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

// --- signup route ---
app.post("/signup", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  let users = readUsers();

  if (users.find((u) => u.username === username)) {
    return res.status(400).json({ error: "Username already exists" });
  }

  // base64 encode password (placeholder until bcrypt)
  const encodedPass = Buffer.from(password).toString("base64");

  users.push({ username, password: encodedPass });
  writeUsers(users);

  res.json({ success: true, message: "User created" });
});

// --- login route ---
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  let users = readUsers();
  const user = users.find((u) => u.username === username);

  if (!user) {
    return res.status(400).json({ error: "User not found" });
  }

  const encodedPass = Buffer.from(password).toString("base64");
  if (user.password !== encodedPass) {
    return res.status(401).json({ error: "Invalid password" });
  }

  res.json({ success: true, message: "Login successful" });
});

// --- WebSocket stuff ---
let onlineUsers = 0;

wss.on("connection", (ws) => {
  onlineUsers++;
  broadcastCount();

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
server.listen(PORT, () => console.log(`Backend running on ${PORT}`));
