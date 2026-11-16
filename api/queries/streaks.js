// $1 chat (chat_num)   $2 from   $3 to $4 limit
export const streaksQuery = `
WITH active_days AS (
  SELECT DISTINCT
    m.msg_sender_id AS user_id,
    (m.msg_date AT TIME ZONE 'America/New_York')::date AS day
  FROM messages AS m
  JOIN chats AS c
    ON c.chat_id = m.chat_id
  WHERE ($1::int  IS NULL OR c.chat_num = $1)
    AND ($2::date IS NULL OR m.msg_date >= $2::date)
    AND ($3::date IS NULL OR m.msg_date <  $3::date + 1)
),
labelled_days AS (
  SELECT
    user_id,
    day,
    day - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day))::int AS streak_label
  FROM active_days
),
streaks AS (
  SELECT
    user_id,
    COUNT(*) AS streak_days,
    MIN(day) AS streak_start,
    MAX(day) AS streak_end
  FROM labelled_days
  GROUP BY user_id, streak_label
),
longest_streaks AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    streak_days,
    streak_start,
    streak_end
  FROM streaks
  ORDER BY user_id, streak_days DESC, streak_end DESC
)
SELECT
  RANK() OVER (ORDER BY ls.streak_days DESC) AS rank,
  p.user_id,
  p.name,
  ls.streak_days AS longest_streak_days,
  ls.streak_start,
  ls.streak_end
FROM longest_streaks AS ls
JOIN people AS p
  ON p.user_id = ls.user_id
ORDER BY ls.streak_days DESC, ls.streak_end DESC
LIMIT $4;
`;
