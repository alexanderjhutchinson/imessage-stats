// iMessage Stats dashboard.
//
// How it works:
//   1. On page load, fill the chat and person dropdowns, then load every section.
//   2. Each section calls one API endpoint with fetch() and turns the JSON into HTML.
//   3. Changing a filter reloads every section.

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

// Shorthand for document.getElementById.
const $ = (id) => document.getElementById(id);

// Message text comes straight from iMessage. If we put it into innerHTML as-is,
// a message containing "<b>" or "<img ...>" would be treated as real HTML.
// Escaping turns those characters into harmless text.
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Null-safe display helpers. People not in Contacts have no name, and the API
// doesn't return their phone number, so we fall back to their id.
const personName = (p) => escapeHtml(p.name ?? `Unknown #${p.userId}`);
const chatName = (c) => escapeHtml(c.name ?? `Unnamed chat #${c.chatId}`);

// Numbers: show "—" for null/undefined, otherwise add thousands separators.
// (`x == null` is true for both null and undefined.)
const fmt = (n) => (n == null ? "—" : n.toLocaleString());

// Call the API. `params` is an object like { chat: "12", from: "" }.
// Empty values are skipped, so we only send the filters that are actually set.
async function api(path, params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== "" && value != null) query.set(key, value);
  }
  const url = query.size > 0 ? `${path}?${query}` : path;

  const res = await fetch(url);
  const body = await res.json().catch(() => null); // null if the body isn't JSON

  // fetch() doesn't throw on 400/500, so check res.ok ourselves and surface
  // the API's { error: "..." } message.
  if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
  return body;
}

// Load one section: show "Loading…", fetch, then render the result or the error.
//
// The request counter guards against a race: if you change filters twice quickly,
// the first (now outdated) response might arrive *after* the second one. We only
// draw a response if it belongs to the most recent request for that box.
const latestRequest = {};

async function load(boxId, fetchData, render) {
  const box = $(boxId);
  const requestNumber = (latestRequest[boxId] ?? 0) + 1;
  latestRequest[boxId] = requestNumber;

  box.innerHTML = `<p class="loading">Loading…</p>`;
  try {
    const data = await fetchData();
    if (latestRequest[boxId] === requestNumber) box.innerHTML = render(data);
  } catch (err) {
    if (latestRequest[boxId] === requestNumber) {
      box.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
    }
  }
}

// Read the filter bar. Empty inputs give "", which api() skips.
function getFilters() {
  return {
    chat: $("filter-chat").value,
    person: $("filter-person").value,
    from: $("filter-from").value, // <input type="date"> already gives YYYY-MM-DD
    to: $("filter-to").value,
  };
}

// ---------------------------------------------------------------------------
// Shared renderer: a list of messages (used by three sections)
// ---------------------------------------------------------------------------

function renderMessageList(messages) {
  if (messages.length === 0) return `<p class="note">No messages.</p>`;

  return messages
    .map((m) => {
      // Photos and videos: <img> or <video> pointing at /api/attachments/:id.
      // Other attachment types (voice memos, link previews, files) are skipped.
      const media = m.attachments
        .map((a) => {
          const src = escapeHtml(a.url);
          if (a.mimeType?.startsWith("image/")) return `<img src="${src}" loading="lazy" alt="">`;
          if (a.mimeType?.startsWith("video/")) return `<video src="${src}" controls preload="metadata"></video>`;
          return "";
        })
        .join("");

      // iMessage puts an invisible "￼" placeholder in the text for each attachment; remove those.
      const text = (m.content ?? "").replaceAll("￼", "").trim();
      let content = "";
      if (text) {
        content = escapeHtml(text);
      } else if (!media) {
        content = `<span class="empty-content">(no text, probably an attachment)</span>`;
      }

      // e.g. "Jordan (laugh), Priya (laugh)"
      const reactors = m.reactors
        .map((r) => `${personName(r)} (${escapeHtml(r.type)})`)
        .join(", ");

      return `
        <div class="message">
          <div class="meta">
            <strong>${personName(m.sender)}</strong> in ${chatName(m.chat)}
            · ${escapeHtml(m.date)} · ${fmt(m.reactionCount)} reactions
          </div>
          ${content ? `<div class="content">${content}</div>` : ""}
          ${media ? `<div class="media">${media}</div>` : ""}
          ${reactors ? `<div class="reactors">${reactors}</div>` : ""}
        </div>`;
    })
    .join("");
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

// 1. User stats: /api/stats/people (accepts chat, from, to; not person)
function loadPeopleStats() {
  const { chat, from, to } = getFilters();
  load("people-stats", () => api("/api/stats/people", { chat, from, to }), (rows) => {
    if (rows.length === 0) return `<p class="note">No data.</p>`;
    return `
      <table>
        <tr>
          <th>Name</th>
          <th class="num">Messages</th>
          <th class="num">Reactions sent</th>
          <th class="num">Reactions received</th>
          <th class="num">Avg reactions / msg</th>
          <th class="num">Most on one msg</th>
          <th class="num">Msgs per reaction sent</th>
        </tr>
        ${rows
          .map(
            (p) => `
          <tr>
            <td>${personName(p)}</td>
            <td class="num">${fmt(p.messagesSent)}</td>
            <td class="num">${fmt(p.reactionsSent)}</td>
            <td class="num">${fmt(p.reactionsReceived)}</td>
            <td class="num">${fmt(p.avgReactionsPerMessage)}</td>
            <td class="num">${fmt(p.maxReactionsOnMessage)}</td>
            <td class="num">${fmt(p.messageReactionRatio)}</td>
          </tr>`
          )
          .join("")}
      </table>`;
  });
}

// 2. Messages: /api/messages (accepts every filter, plus sort/reactionType/limit)
function loadMessages() {
  const limit = Number($("msg-limit").value);
  const params = {
    ...getFilters(), // copies chat, person, from, to into this object
    sort: $("msg-sort").value,
    reactionType: $("msg-reaction-type").value,
    limit,
  };
  load("messages", () => api("/api/messages", params), (msgs) => renderMessageList(msgs));
}

// 3a. Leaderboard: most-reacted messages
function loadTopMessages() {
  const params = { ...getFilters(), sort: "reactions", limit: 10 };
  load("top-messages", () => api("/api/messages", params), (msgs) => renderMessageList(msgs));
}

// 3b. Leaderboard: longest streaks (accepts chat, from, to; not person)
function loadStreaks() {
  const { chat, from, to } = getFilters();
  load("streaks", () => api("/api/leaderboards/streaks", { chat, from, to, limit: 10 }), (rows) => {
    if (rows.length === 0) return `<p class="note">No data.</p>`;
    return `
      <table>
        <tr><th>#</th><th>Name</th><th class="num">Days</th><th>From → to</th></tr>
        ${rows
          .map(
            (s) => `
          <tr>
            <td>${s.rank}</td>
            <td>${personName(s)}</td>
            <td class="num">${fmt(s.longestStreakDays)}</td>
            <td>${escapeHtml(s.streakStart)} → ${escapeHtml(s.streakEnd)}</td>
          </tr>`
          )
          .join("")}
      </table>`;
  });
}

// 4. Busiest days: /api/stats/busiest-day (accepts every filter)
function loadBusiestDays() {
  $("day-messages").innerHTML = ""; // hide any previously opened day
  load("busiest-days", () => api("/api/stats/busiest-day", { ...getFilters(), limit: 10 }), (days) => {
    if (days.length === 0) return `<p class="note">No data.</p>`;
    const max = days[0].messageCount; // sorted descending, so the first is biggest
    return `
      <table>
        <tr><th>Date</th><th class="num">Messages</th><th style="width:40%"></th><th></th></tr>
        ${days
          .map(
            (d) => `
          <tr>
            <td>${escapeHtml(d.date)}</td>
            <td class="num">${fmt(d.messageCount)}</td>
            <td><div class="bar" style="width:${(d.messageCount / max) * 100}%"></div></td>
            <td><button type="button" data-day="${escapeHtml(d.date)}">Top messages</button></td>
          </tr>`
          )
          .join("")}
      </table>`;
  });
}

// Clicking "Top messages" on a busiest day: that day's most-reacted messages.
function loadDayMessages(day) {
  const params = { ...getFilters(), from: day, to: day, sort: "reactions", limit: 10 };
  load("day-messages", () => api("/api/messages", params), (msgs) =>
    `<h3>Top messages on ${escapeHtml(day)}</h3>` + renderMessageList(msgs)
  );
}

// 5. Who reacts to whom: /api/stats/reaction-matrix (accepts chat, from, to)
//    Rows come back sorted by count, highest first, one row per (reactor, reactedTo) pair.
function loadReactionMatrix() {
  const { chat, from, to } = getFilters();
  load("reaction-matrix", () => api("/api/stats/reaction-matrix", { chat, from, to }), (rows) => {
    if (rows.length === 0) return `<p class="note">No reactions.</p>`;

    // Work out each person's biggest fan, plus their total reactions received.
    // Because rows are sorted by count, the FIRST row we see for a given
    // reactedTo person is their biggest fan.
    const fans = new Map(); // userId -> { person, fan, fanCount, total }
    for (const row of rows) {
      const id = row.reactedTo.userId;
      if (!fans.has(id)) {
        fans.set(id, { person: row.reactedTo, fan: row.reactor, fanCount: row.count, total: 0 });
      }
      fans.get(id).total += row.count;
    }
    const fanList = [...fans.values()].sort((a, b) => b.total - a.total);

    // Remember which pairs are "biggest fan" pairs, so we can highlight them below.
    const fanPairs = new Set(fanList.map((f) => `${f.fan.userId}->${f.person.userId}`));

    const TOP_PAIRS = 30;
    return `
      <div class="two-col">
        <div>
          <h3>Biggest fans</h3>
          <table>
            <tr><th>Person</th><th>Biggest fan</th><th class="num">Their reactions</th><th class="num">Total received</th></tr>
            ${fanList
              .map(
                (f) => `
              <tr>
                <td>${personName(f.person)}</td>
                <td>${personName(f.fan)}</td>
                <td class="num">${fmt(f.fanCount)}</td>
                <td class="num">${fmt(f.total)}</td>
              </tr>`
              )
              .join("")}
          </table>
        </div>
        <div>
          <h3>Top pairs</h3>
          <p class="note">Top ${Math.min(TOP_PAIRS, rows.length)} of ${rows.length} pairs.
            <span class="highlight">Highlighted</span> rows are someone's biggest fan.</p>
          <table>
            <tr><th>Reactor</th><th>→ Reacted to</th><th class="num">Count</th></tr>
            ${rows
              .slice(0, TOP_PAIRS)
              .map((r) => {
                const isFan = fanPairs.has(`${r.reactor.userId}->${r.reactedTo.userId}`);
                return `
                <tr class="${isFan ? "highlight" : ""}">
                  <td>${personName(r.reactor)}</td>
                  <td>${personName(r.reactedTo)}</td>
                  <td class="num">${fmt(r.count)}</td>
                </tr>`;
              })
              .join("")}
          </table>
        </div>
      </div>`;
  });
}

// ---------------------------------------------------------------------------
// Wiring it all together
// ---------------------------------------------------------------------------

function refreshAll() {
  loadPeopleStats();
  loadMessages();
  loadTopMessages();
  loadStreaks();
  loadBusiestDays();
  loadReactionMatrix();
}

// Fill the chat and person dropdowns. `new Option(text, value)` builds an
// <option> element safely (no HTML escaping needed).
async function fillDropdowns() {
  try {
    const [chats, people] = await Promise.all([api("/api/chats"), api("/api/people")]);
    for (const c of chats) {
      $("filter-chat").add(new Option(c.name ?? `Unnamed chat #${c.chatId}`, c.chatId));
    }
    for (const p of people) {
      $("filter-person").add(new Option(p.name ?? `Unknown #${p.userId}`, p.userId));
    }
  } catch (err) {
    $("filter-error").innerHTML = `<p class="error">Couldn't load filters: ${escapeHtml(err.message)}</p>`;
  }
}

// A "change" event on any input inside the form bubbles up to the form itself,
// so one listener covers all four filters.
$("filters").addEventListener("change", refreshAll);

$("filter-clear").addEventListener("click", () => {
  $("filters").reset(); // puts every input back to its default
  refreshAll();
});

// The message controls only affect the Messages section.
for (const id of ["msg-sort", "msg-reaction-type", "msg-limit"]) {
  $(id).addEventListener("change", loadMessages);
}

// The busiest-days table is redrawn on every load, so instead of adding a click
// listener to each button, we listen once on the container and check whether
// the click landed on a button with a data-day attribute ("event delegation").
$("busiest-days").addEventListener("click", (event) => {
  const day = event.target.dataset.day;
  if (day) loadDayMessages(day);
});

// Start: fill dropdowns, then load everything.
fillDropdowns().then(refreshAll);
