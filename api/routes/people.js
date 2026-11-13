import express from "express";
import { pool } from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
        SELECT user_id, name
        FROM people
        ORDER BY name NULLS LAST
    `);

    const people = result.rows.map((row) => ({
      userId: row.user_id,
      name: row.name,
    }));

    res.json(people);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load people" });
  }
});

export default router;
