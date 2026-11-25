import express from "express";
import os from "node:os";
import { pool } from "../db.js";
import { attachmentQuery } from "../queries/attachments.js";

const router = express.Router();

router.get("/:attachmentId", async (req, res) => {
  try {
    const attachmentId = req.params.attachmentId;

    // run sql query
    const result = await pool.query(attachmentQuery, [attachmentId]);

    // validate result
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    // transform filepath into actual file
    const filePath = result.rows[0].filename.replace("~", os.homedir());

    // send the file itself
    res.sendFile(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load attachment" });
  }
});

export default router;
