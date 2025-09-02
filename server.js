import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import cors from "cors";
import fs from "fs";
import bcrypt from "bcryptjs";

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

// === Signup endpoint ===
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Missing fields" });
  if (users[username]) return res.status(400).json({ error: "Username taken" });

  const hash = await bcrypt.hash(password, 10);
  users[username] = { password: hash };
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  res.json({ success: true });
});

// === Login endpoint ===
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Missing fields" });

  const user = users[username];
  if (!user) return res.status(400).json({ error: "User not found" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: "Invalid password" });

  res.json({ success: true });
});

// === WebSocket / chat code remains the same ===
// ... existing wss.on("connection") logic

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`YeahChat backend is running 🚀 on port ${PORT}`);
});
