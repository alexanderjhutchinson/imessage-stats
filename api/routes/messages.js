import express from "express";
import { pool } from "../db.js";
import { ValidationError, parseFilters, parseNumber, parseChoice } from "../validation.js";
import { messagesQuery } from "../queries/messages.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // validate input
    const { chat, person, from, to } = parseFilters(req.query);
    const limit = parseNumber(req.query.limit, "limit") ?? 50;
    const sort = parseChoice(req.query.sort, "sort", ["date", "length", "reactions"]) ?? "date";
    const reactionType = parseChoice(req.query.reactionType, "reactionType", ["love", "like", "dislike", "laugh", "emphasize", "question", "emoji"]);
    const values = [chat, person, from, to, reactionType, sort, limit];

    // run sql query
    const result = await pool.query(messagesQuery, values);

    const messages = result.rows.map((row) => ({
      msgId: row.msg_id,
      content: row.msg_content,
      sender: { userId: row.sender_id, name: row.sender_name },
      chat: { chatId: row.chat_num, name: row.chat_name },
      date: row.msg_date,
      length: row.msg_length,
      reactionCount: row.reaction_count,
      reactors: row.reactors,
    }));

    res.json(messages);
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to load messages" });
  }
});

export default router;
