// $1 chat (chat_num)   $2 from   $3 to
export const peopleStatsQuery = `
WITH filtered_messages AS (
  SELECT m.*
  FROM messages AS m
  JOIN chats AS c
    ON c.chat_id = m.chat_id
  WHERE ($1::int  IS NULL OR c.chat_num = $1)
    AND ($2::date IS NULL OR m.msg_date >= $2::date)
    AND ($3::date IS NULL OR m.msg_date <  $3::date + 1)
),
filtered_reactions AS (
  SELECT r.*
  FROM reactions AS r
  JOIN messages AS m
    ON m.msg_id = r.target_msg_id
  JOIN chats AS c
    ON c.chat_id = m.chat_id
  WHERE ($1::int  IS NULL OR c.chat_num = $1)
    AND ($2::date IS NULL OR r.reaction_date >= $2::date)
    AND ($3::date IS NULL OR r.reaction_date <  $3::date + 1)
),
messages_sent AS (
  SELECT
    msg_sender_id AS user_id,
    COUNT(*) AS messages_sent
  FROM filtered_messages
  GROUP BY msg_sender_id
),
reactions_sent AS (
  SELECT
    reactor_id AS user_id,
    COUNT(*) AS reactions_sent
  FROM filtered_reactions
  GROUP BY reactor_id
),
reactions_per_message AS (
  SELECT
    m.msg_id,
    m.msg_sender_id AS user_id,
    COUNT(r.reaction_id) AS reaction_count
  FROM filtered_messages AS m
  LEFT JOIN reactions AS r
    ON r.target_msg_id = m.msg_id
  GROUP BY m.msg_id, m.msg_sender_id
),
received_and_max AS (
  SELECT
    user_id,
    SUM(reaction_count) AS reactions_received,
    MAX(reaction_count) AS max_reactions
  FROM reactions_per_message
  GROUP BY user_id
)
SELECT
  p.user_id,
  p.name,
  COALESCE(ms.messages_sent, 0)      AS messages_sent,
  COALESCE(rs.reactions_sent, 0)     AS reactions_sent,
  COALESCE(rm.reactions_received, 0) AS reactions_received,
  ROUND(
    COALESCE(rm.reactions_received, 0)::numeric / NULLIF(ms.messages_sent, 0),
    2
  ) AS avg_reactions_per_message,
  COALESCE(rm.max_reactions, 0)      AS max_reactions_on_message,
  ROUND(
    COALESCE(ms.messages_sent, 0)::numeric / NULLIF(rs.reactions_sent, 0),
    2
  ) AS message_reaction_ratio
FROM people AS p
LEFT JOIN messages_sent AS ms
  ON ms.user_id = p.user_id
LEFT JOIN reactions_sent AS rs
  ON rs.user_id = p.user_id
LEFT JOIN received_and_max AS rm
  ON rm.user_id = p.user_id
WHERE ms.messages_sent IS NOT NULL
   OR rs.reactions_sent IS NOT NULL
ORDER BY messages_sent DESC;
`;
