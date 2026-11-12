import pg from "pg";
import { PG_CONFIG } from "./config.js";

export async function load(data) {
  // unpack tables
  const { chats, people, handles, messages, reactions } = data;

  // connect to pg db
  const client = new pg.Client(PG_CONFIG);
  await client.connect();

  try {
    // Begin
    await client.query("BEGIN");

    // insert chats - add new chats, if chats currently exist update their display name
    for (const chat of chats) {
      const chatQuery = `
        INSERT INTO chats (chat_id, display_name)
        VALUES ($1, $2)
        ON CONFLICT (chat_id)
        DO UPDATE SET display_name = EXCLUDED.display_name
        `;
      await client.query(chatQuery, [chat.chatId, chat.displayName]);
    }

    // insert people - for each person, check if they have a contact_id in imessage-stats.people use their user_id, otherwise match their handle to imessage-stats.handles to get a user_id. ...
    const userIdByKey = new Map();
    for (const person of people) {
      // look them up in db
      let lookup;
      if (person.contactId) {
        const lookupQuery = `
            SELECT user_id
            FROM people
            WHERE contact_id = $1
        `;
        lookup = await client.query(lookupQuery, [person.contactId]);
      } else {
        const lookupQuery = `
            SELECT user_id
            FROM handles
            WHERE handle = $1
        `;
        lookup = await client.query(lookupQuery, [person.personKey]);
      }

      let userId;
      if (lookup.rows.length > 0) {
        // take their user_id, then update their name
        userId = lookup.rows[0].user_id;
        const updateQuery = `
            UPDATE people
            SET name = $1
            WHERE user_id = $2
        `;
        await client.query(updateQuery, [person.name, userId]);
      } else {
        // Not found: insert them, and get the new user_id back
        const insertQuery = `
            INSERT INTO people (name, contact_id)
            VALUES ($1, $2)
            RETURNING user_id
        `;
        const inserted = await client.query(insertQuery, [person.name, person.contactId]);
        userId = inserted.rows[0].user_id;
      }

      // Record personKey -> user_id
      userIdByKey.set(person.personKey, userId);
    }

    // insert handles - add handles, pulling user_id from personKey
    for (const h of handles) {
      const handleQuery = `
        INSERT INTO handles (handle, user_id)
        VALUES ($1, $2)
        ON CONFLICT (handle) DO NOTHING
        `;
      await client.query(handleQuery, [h.handle, userIdByKey.get(h.personKey)]);
    }

    // insert messages - insert new msgs, skip msgs who's guid currently exist in table
    const messageQuery = `
      INSERT INTO messages (msg_id, chat_id, msg_content, msg_date, msg_sender_id)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (msg_id) DO NOTHING
    `;
    let msgCount = 0;
    for (const msg of messages) {
      await client.query(messageQuery, [msg.msgId, msg.chatId, msg.content, msg.date, userIdByKey.get(msg.senderKey)]);
      msgCount++;
      if (msgCount % 10000 === 0) console.log(`messages: ${msgCount} / ${messages.length}`);
    }

    // insert reactions - insert new reactions, skip reactions whose guid already exists
    const reactionQuery = `
      INSERT INTO reactions (reaction_id, reactor_id, target_msg_id, reaction_type, reaction_date, emoji)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (reaction_id) DO NOTHING
    `;
    let reactionCount = 0;
    for (const r of reactions) {
      await client.query(reactionQuery, [r.reactionId, userIdByKey.get(r.reactorKey), r.targetMsgId, r.type, r.date, r.emoji]);
      reactionCount++;
      if (reactionCount % 10000 === 0) console.log(`reactions: ${reactionCount} / ${reactions.length}`);
    }

    // Commit
    await client.query("COMMIT");
  } catch (err) {
    // rollback
    await client.query("ROLLBACK");

    // rethrow error for logs
    throw err;
  } finally {
    // disconnect from pg db
    await client.end();
  }
}
