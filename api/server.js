import express from "express";
import { pool } from "./db.js";
import chatsRouter from "./routes/chats.js";
import peopleRouter from "./routes/people.js";
import statsRouter from "./routes/stats.js";
import leaderboardsRouter from "./routes/leaderboards.js";
import messagesRouter from "./routes/messages.js";

const app = express();
const PORT = 3000;

app.get("/api/health", async (req, res) => {
  const result = await pool.query("SELECT NOW()");
  res.json({ ok: true, dbTime: result.rows[0].now });
});

app.use("/api/chats", chatsRouter);

app.use("/api/people", peopleRouter);

app.use("/api/stats", statsRouter);

app.use("/api/leaderboards", leaderboardsRouter);

app.use("/api/messages", messagesRouter);

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
