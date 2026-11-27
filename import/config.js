// Source database copies
export const chatDbPath = process.env.CHAT_DB || "db/chat-copy.db";
export const contactDbPath = "db/contacts-copy.abcddb";

// Your own name in the people table
export const MY_NAME = process.env.MY_NAME || "Me";
export const ME_KEY = "me";

// PostgreSQL connection
export const PG_CONFIG = {
  host: "localhost",
  port: 5432,
  user: "alexanderhutchinson",
  database: process.env.PG_DB || "imessage-stats",
};
