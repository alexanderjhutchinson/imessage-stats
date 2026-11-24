CREATE TABLE chats (
  chat_id text PRIMARY KEY,
  display_name text,
  chat_num INT GENERATED ALWAYS AS IDENTITY UNIQUE
);
CREATE TABLE people (
  user_id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text,
  contact_id text
);
CREATE TABLE messages (
  msg_id text PRIMARY KEY,
  chat_id text NOT NULL REFERENCES chats(chat_id),
  msg_content text,
  msg_date timestamptz NOT NULL,
  msg_sender_id int NOT NULL REFERENCES people(user_id)
);
CREATE TABLE reactions (
  reaction_id text PRIMARY KEY,
  reactor_id int NOT NULL REFERENCES people(user_id),
  target_msg_id text NOT NULL REFERENCES messages(msg_id),
  reaction_type text NOT NULL,
  reaction_date timestamptz NOT NULL,
  emoji text
);
CREATE TABLE handles (
  handle text PRIMARY KEY,
  user_id int NOT NULL REFERENCES people(user_id)
);
CREATE TABLE attachments (
  attachment_id text PRIMARY KEY,
  msg_id text NOT NULL REFERENCES messages(msg_id),
  filename text,
  mime_type text
);