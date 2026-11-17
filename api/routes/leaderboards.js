import express from "express";
import { pool } from "../db.js";
import { ValidationError, parseFilters, parseNumber } from "../validation.js";
import { streaksQuery } from "../queries/streaks.js";

const router = express.Router();

// GET /api/leaderboards/streaks
router.get("/streaks", async (req, res) => {
  try {
    // validate input
    const { chat, from, to } = parseFilters(req.query);
    const limit = parseNumber(req.query.limit, "limit") ?? 10;
    const values = [chat, from, to, limit];

    // run sql query
    const result = await pool.query(streaksQuery, values);

    // format result
    const streaks = result.rows.map((row) => ({
      rank: row.rank,
      userId: row.user_id,
      name: row.name,
      longestStreakDays: row.longest_streak_days,
      streakStart: row.streak_start,
      streakEnd: row.streak_end,
    }));
    res.json(streaks);
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to load streaks" });
  }
});

export default router;
