// Source database copies
export const chatDbPath = "./db/chat-copy.db";
export const contactDbPath = "./db/AddressBook-v22.abcddb";

// Your own name in the people table
export const MY_NAME = process.env.MY_NAME || "Me";
export const ME_KEY = "me";

// PostgreSQL connection (used by load.js)
export const PG_CONFIG = {
  host: "localhost",
  port: 5432,
  user: "alexanderhutchinson",
  database: "imessage-stats", // check this matches the name in TablePlus
};
