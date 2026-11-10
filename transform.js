import { MY_NAME, ME_KEY } from "./config.js";

const APPLE_EPOCH_MS = 978307200000;

const REACTION_TYPES = {
  2000: "love",
  2001: "like",
  2002: "dislike",
  2003: "laugh",
  2004: "emphasize",
  2005: "question",
  2006: "emoji",
};

// ---------- Helpers (private to this file) ----------
function appleToDate(appleDate) {
  // Newer macOS stores nanoseconds; very old messages store seconds.
  const ms = appleDate > 1e12 ? appleDate / 1e6 : appleDate * 1000;
  return new Date(APPLE_EPOCH_MS + ms);
}

function normalizeHandle(raw) {
  if (!raw) return null;
  if (raw.includes("@")) {
    return raw.trim().toLowerCase();
  }
  return raw.replace(/\D/g, "").slice(-10);
}

function reactionType(code) {
  return REACTION_TYPES[code];
}

function contactName(first, last) {
  const name = `${first || ""} ${last || ""}`.trim();
  return name || null;
}

// ---------- Transform ----------
export function transform(data) {
  const { chats, contacts, handles, messages, reactions } = data;

  // Normalize chat.db handles
  const cleanHandles = handles.map((h) => ({
    handle: h.id,
    normalized: normalizeHandle(h.id),
  }));

  // Lookup: normalized phone/email -> contact
  const contactByHandle = new Map();
  for (const c of contacts) {
    const key = normalizeHandle(c.handle);
    if (!key) continue;
    contactByHandle.set(key, {
      contactId: c.ZUNIQUEID,
      name: contactName(c.ZFIRSTNAME, c.ZLASTNAME),
    });
  }

  // Build people, and pair each handle with its person
  const people = new Map(); // personKey -> person
  const personHandles = []; // { handle, personKey }

  for (const h of cleanHandles) {
    const contact = contactByHandle.get(h.normalized);
    const personKey = contact ? contact.contactId : h.handle;

    if (!people.has(personKey)) {
      people.set(personKey, {
        personKey: personKey,
        contactId: contact ? contact.contactId : null,
        name: contact ? contact.name : null,
      });
    }

    personHandles.push({ handle: h.handle, personKey: personKey });
  }

  people.set(ME_KEY, { personKey: ME_KEY, contactId: null, name: MY_NAME });

  // Senders and reactors -> personKey
  const personKeyByHandle = new Map();
  for (const ph of personHandles) {
    personKeyByHandle.set(ph.handle, ph.personKey);
  }

  function senderKey(isFromMe, sender) {
    return isFromMe ? ME_KEY : personKeyByHandle.get(sender);
  }

  const cleanMessages = messages
    .map((msg) => ({
      msgId: msg.guid,
      chatId: msg.chat_guid,
      content: msg.text,
      date: appleToDate(msg.date),
      senderKey: senderKey(msg.is_from_me, msg.sender),
    }))
    .filter((msg) => msg.senderKey);

  // IDs of every message being imported, for checking reaction targets
  const msgIds = new Set(cleanMessages.map((msg) => msg.msgId));

  const cleanReactions = reactions
    .map((r) => {
      const type = reactionType(r.associated_message_type);
      return {
        reactionId: r.guid,
        reactorKey: senderKey(r.is_from_me, r.sender),
        targetMsgId: r.associated_message_guid,
        type: type,
        date: appleToDate(r.date),
        emoji: type === "emoji" ? r.associated_message_emoji : null,
      };
    })
    .filter((r) => r.reactorKey && msgIds.has(r.targetMsgId));

  // Chat names
  const cleanChats = chats.map((c) => {
    let displayName = c.display_name || null;
    const isOneOnOne = c.chat_identifier && !c.chat_identifier.startsWith("chat");

    if (!displayName && isOneOnOne) {
      const contact = contactByHandle.get(normalizeHandle(c.chat_identifier));
      displayName = contact && contact.name ? contact.name : c.chat_identifier;
    }

    return { chatId: c.guid, displayName: displayName };
  });

  return {
    chats: cleanChats,
    people: [...people.values()],
    handles: personHandles,
    messages: cleanMessages,
    reactions: cleanReactions,
  };
}
