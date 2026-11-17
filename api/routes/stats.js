import express from "express";
import { pool } from "../db.js";
import { ValidationError, parseFilters, parseNumber } from "../validation.js";
import { busiestDayQuery } from "../queries/busiestDay.js";
import { peopleStatsQuery } from "../queries/peopleStats.js";
import { reactionMatrixQuery } from "../queries/reactionMatrix.js";

const router = express.Router();

// GET /api/stats/busiest-day
router.get("/busiest-day", async (req, res) => {
  try {
    // validate request parameter
    const { chat, person, from, to } = parseFilters(req.query);
    const limit = parseNumber(req.query.limit, "limit") ?? 1;
    const values = [chat, person, from, to, limit];

    const result = await pool.query(busiestDayQuery, values);
    const busiestDays = result.rows.map((row) => ({
      date: row.day,
      messageCount: row.message_count,
    }));

    res.json(busiestDays);
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to load busiest days" });
  }
});

// GET /api/stats/reaction-matrix
router.get("/reaction-matrix", async (req, res) => {
  try {
    const { chat, from, to } = parseFilters(req.query);
    const values = [chat, from, to];

    const result = await pool.query(reactionMatrixQuery, values);
    const reactionMatrix = result.rows.map((row) => ({
      reactor: {
        userId: row.reactor_id,
        name: row.reactor_name,
      },
      reactedTo: {
        userId: row.reacted_to_id,
        name: row.reacted_to_name,
      },
      count: row.reaction_count,
    }));

    res.json(reactionMatrix);
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to load reaction matrix" });
  }
});

//GET /api/stats/people
router.get("/people", async (req, res) => {
  try {
    const { chat, from, to } = parseFilters(req.query);
    const values = [chat, from, to];

    const result = await pool.query(peopleStatsQuery, values);
    const people = result.rows.map((row) => ({
      userId: row.user_id,
      name: row.name,
      messagesSent: row.messages_sent,
      reactionsSent: row.reactions_sent,
      reactionsReceived: row.reactions_received,
      avgReactionsPerMessage: row.avg_reactions_per_message,
      maxReactionsOnMessage: row.max_reactions_on_message,
      messageReactionRatio: row.message_reaction_ratio,
    }));

    res.json(people);
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to load people stats" });
  }
});

export default router;
