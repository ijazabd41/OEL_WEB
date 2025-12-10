const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 4000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/dual_nature_list";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

app.use(
  cors({
    origin: "*",
    credentials: false,
  })
);
app.use(express.json());

// Serve frontend files (index.html, styles.css, script.js, assets, etc.)
app.use(express.static(path.join(__dirname)));

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    username: { type: String }, // login handle (can be used instead of email)
    name: { type: String }, // display name
  },
  { timestamps: true }
);

const itemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const statsSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    completedTotal: { type: Number, default: 0 },
    lastCompletedDay: { type: String, default: null },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
const Item = mongoose.model("Item", itemSchema);
const Stats = mongoose.model("Stats", statsSchema);

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const [, token] = header.split(" ");
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, username, name } = req.body;
    if (!email || !password || !username || !name) {
      return res
        .status(400)
        .json({ error: "Name, email, username, and password are required" });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: "User already exists" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, username, name });
    await Stats.create({ userId: user._id });
    const token = jwt.sign({ sub: user._id.toString() }, JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        name: user.name,
      },
    });
  } catch (err) {
    console.error("Register error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { identifier, email, password } = req.body;
    const id = identifier || email;
    if (!id || !password) {
      return res
        .status(400)
        .json({ error: "Email/username and password are required" });
    }
    const query = {
      $or: [{ email: id.toLowerCase() }, { username: id }],
    };
    const user = await User.findOne(query);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ sub: user._id.toString() }, JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        name: user.name,
      },
    });
  } catch (err) {
    console.error("Login error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/items", authMiddleware, async (req, res) => {
  const items = await Item.find({ userId: req.userId }).sort({ createdAt: -1 });
  res.json(items);
});

app.post("/api/items", authMiddleware, async (req, res) => {
  const { text, completed } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Text required" });
  }
  const item = await Item.create({
    userId: req.userId,
    text: text.trim(),
    completed: !!completed,
  });
  res.status(201).json(item);
});

app.patch("/api/items/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { completed, text } = req.body;
  const item = await Item.findOne({ _id: id, userId: req.userId });
  if (!item) return res.status(404).json({ error: "Not found" });
  if (typeof completed === "boolean") item.completed = completed;
  if (typeof text === "string" && text.trim()) item.text = text.trim();
  await item.save();
  res.json(item);
});

app.delete("/api/items/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const item = await Item.findOneAndDelete({ _id: id, userId: req.userId });
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

app.get("/api/stats", authMiddleware, async (req, res) => {
  let stats = await Stats.findOne({ userId: req.userId });
  if (!stats) {
    stats = await Stats.create({ userId: req.userId });
  }
  res.json(stats);
});

app.patch("/api/stats", authMiddleware, async (req, res) => {
  const allowed = ["level", "xp", "streak", "completedTotal", "lastCompletedDay"];
  const update = {};
  for (const key of allowed) {
    if (key in req.body) update[key] = req.body[key];
  }
  const stats = await Stats.findOneAndUpdate(
    { userId: req.userId },
    { $set: update },
    { new: true, upsert: true }
  );
  res.json(stats);
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "home.html"));
});

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`API server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server", err);
    process.exit(1);
  }
}

start();


