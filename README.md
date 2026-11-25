# iMessage Stats

A local dashboard of stats about your iMessage chats: who sends the most messages, who gets the most reactions, the most-reacted messages, streaks, busiest days, and who reacts to whom.

Built with Node.js, PostgreSQL and Express. Everything runs on your Mac.

> The frontend (`public/`) was built by AI, using Claude.

## Requirements

- macOS with iMessage
- Node.js
- PostgreSQL running locally

## Setup

Run every command from the project root, the `imessage-stats` folder that contains `package.json`:

```bash
cd path/to/imessage-stats
```

**1. Install dependencies** (from the project root)

```bash
npm install
```

**2. Create the database and tables** (from the project root)

```bash
createdb imessage-stats
psql -d imessage-stats -f schema.sql
```

The connection settings are in `PG_CONFIG` in `import/config.js`. Change the `user` there if yours is different.

**3. Copy your Messages and Contacts databases into `db/`**

Copy these two files into a `db/` folder in the project, renaming them as shown:

| Copy                                                                            | To                        |
| ------------------------------------------------------------------------------- | ------------------------- |
| `~/Library/Messages/chat.db`                                                    | `db/chat-copy.db`         |
| `~/Library/Application Support/AddressBook/Sources/<ID>/AddressBook-v22.abcddb` | `db/contacts-copy.abcddb` |

Use the Contacts file inside `Sources/`, not the one at the top of `AddressBook/`, which has no contacts in it. If `Sources/` has more than one folder, use the largest file.

**4. Import** (from the project root)

```bash
node import/import.js
```

This must run from the project root, because `import/config.js` looks for `db/chat-copy.db` relative to the current folder.

Your own messages are attributed to "Me". To use your name instead, run `MY_NAME="Your Name" node import/import.js`.

**5. Start the server** (from the project root)

```bash
node api/server.js
```

This must run from the project root, because the server looks for `public/` relative to the current folder. From anywhere else the API still works but the dashboard shows "Cannot GET /".

Then open http://localhost:3000 **in Safari**. To have the server restart when you edit a file, use `node --watch api/server.js` instead.

**To see photos and videos:**

- **Give the app you run the server in Full Disk Access.** That's Terminal, VS Code, or whatever you use. Photos are read straight from `~/Library/Messages/Attachments`, which macOS protects. Turn the app on in System Settings → Privacy & Security → Full Disk Access, then quit and reopen it. Without this, photos fail to load.
- **Use Safari.** Most iPhone photos are HEIC, which Chrome and Firefox can't display.

## Updating

To add new messages, repeat steps 3 and 4. Rows that already exist are skipped.

If your contacts have changed, or the first import used the wrong Contacts file, start fresh instead. Otherwise you'll get duplicate people:

```bash
dropdb imessage-stats
```

Then repeat steps 2 to 4 from the project root.

## API

Every endpoint is a GET request and returns JSON, except `/api/attachments`, which returns the file itself. The common filters are all optional: `chat` (a chat ID), `person` (a user ID), and `from` / `to` (dates as `YYYY-MM-DD`).

| Endpoint                     | Returns                                                 | Accepts                                                                      |
| ---------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `/api/health`                | Database status                                         |                                                                              |
| `/api/chats`                 | Chats, for the chat filter                              |                                                                              |
| `/api/people`                | People, for the person filter                           |                                                                              |
| `/api/messages`              | Messages, who reacted, and their attachments            | all filters, `sort` (`date`, `length`, `reactions`), `reactionType`, `limit` |
| `/api/attachments/:id`       | A photo, video or other attachment file                 |                                                                              |
| `/api/stats/people`          | Per-person message and reaction counts                  | `chat`, `from`, `to`                                                         |
| `/api/stats/busiest-day`     | Days with the most messages                             | all filters, `limit`                                                         |
| `/api/stats/reaction-matrix` | How many times each person reacted to each other person | `chat`, `from`, `to`                                                         |
| `/api/leaderboards/streaks`  | Longest runs of consecutive days with a message         | `chat`, `from`, `to`, `limit`                                                |

## Privacy

`db/` holds copies of your messages and contacts. They're gitignored. Photos and videos are never copied; the server reads them from your Messages folder when the dashboard asks for them.
