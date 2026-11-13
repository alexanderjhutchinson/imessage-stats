import express from "express";
import { pool } from "../db.js";

const router = express.Router();

// GET /api/chats
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
        SELECT chat_num, display_name
        FROM chats
        ORDER BY display_name NULLS LAST
        `);

    const chats = result.rows.map((row) => ({
      chatId: row.chat_num,
      name: row.display_name,
    }));

    res.json(chats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load chats" });
  }
});

export default router;
