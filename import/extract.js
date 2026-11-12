import Database from "better-sqlite3";
import { chatDbPath, contactDbPath } from "./config.js";

export function extract() {
  const chatDb = new Database(chatDbPath, { readonly: true, fileMustExist: true });
  const contactDb = new Database(contactDbPath, { readonly: true, fileMustExist: true });

  // records for chats table
  const chatsQuery = `
    SELECT c.guid, c.display_name, c.chat_identifier
    FROM chat AS c
  `;
  const chats = chatDb.prepare(chatsQuery).all();

  // contact phones and emails, with the contact they belong to
  const contactsQuery = `
    SELECT p.ZFULLNUMBER AS handle, r.ZUNIQUEID, r.ZFIRSTNAME, r.ZLASTNAME
    FROM ZABCDPHONENUMBER AS p
    JOIN ZABCDRECORD AS r ON r.Z_PK = p.ZOWNER
    WHERE p.ZFULLNUMBER IS NOT NULL

    UNION ALL

    SELECT e.ZADDRESS AS handle, r.ZUNIQUEID, r.ZFIRSTNAME, r.ZLASTNAME
    FROM ZABCDEMAILADDRESS AS e
    JOIN ZABCDRECORD AS r ON r.Z_PK = e.ZOWNER
    WHERE e.ZADDRESS IS NOT NULL
  `;
  const contacts = contactDb.prepare(contactsQuery).all();

  // records for handles table
  const handlesQuery = `
    SELECT DISTINCT h.id
    FROM handle AS h
  `;
  const handles = chatDb.prepare(handlesQuery).all();

  // records for messages table
  const messagesQuery = `
    SELECT
      m.guid,
      c.guid AS chat_guid,
      m.text,
      m.date,
      m.is_from_me,
      h.id AS sender
    FROM message AS m
    JOIN chat_message_join AS cmj ON cmj.message_id = m.ROWID
    JOIN chat AS c ON c.ROWID = cmj.chat_id
    LEFT JOIN handle AS h ON h.ROWID = m.handle_id
    WHERE m.associated_message_type = 0
      AND m.item_type = 0
  `;
  const messages = chatDb.prepare(messagesQuery).all();

  // records for reactions table
  const reactionsQuery = `
    SELECT
      m.guid,
      m.associated_message_guid,
      m.associated_message_type,
      m.date,
      m.associated_message_emoji,
      m.is_from_me,
      h.id AS sender
    FROM message AS m
    LEFT JOIN handle AS h ON h.ROWID = m.handle_id
    WHERE m.associated_message_type BETWEEN 2000 AND 2006
  `;
  const reactions = chatDb.prepare(reactionsQuery).all();

  chatDb.close();
  contactDb.close();
  return { chats, contacts, handles, messages, reactions };
}
