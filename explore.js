import Database from "better-sqlite3";

// chat db connection test
const chatDb = new Database("./db/chat-copy.db", { readonly: true, fileMustExist: true });
const chatQuery = chatDb.prepare("SELECT ROWID, chat_identifier, display_name FROM chat LIMIT 5");
const chatOutput = chatQuery.all();
chatDb.close();
console.table(chatOutput);

// contacts db connection test
const contactsDb = new Database("./db/AddressBook-v22.abcddb", { readonly: true, fileMustExist: true });
const contactsQuery = contactsDb.prepare("SELECT Z_PK, ZUNIQUEID FROM ZABCDRECORD LIMIT 5");
const contactsOutput = contactsQuery.all();
contactsDb.close();
console.table(contactsOutput);
