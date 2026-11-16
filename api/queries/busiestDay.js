// $1 chat (chat_num)   $2 person (user_id)   $3 from   $4 to $5 limit
export const busiestDayQuery = `
SELECT 
	(m.msg_date AT TIME ZONE 'America/New_York')::date AS day,
	COUNT(*) as message_count
FROM messages AS m
JOIN chats AS c
  ON c.chat_id = m.chat_id
WHERE ($1::int  IS NULL OR c.chat_num = $1)
  AND ($2::int  IS NULL OR m.msg_sender_id = $2)
  AND ($3::date IS NULL OR m.msg_date >= $3::date)
  AND ($4::date IS NULL OR m.msg_date <  $4::date + 1)
GROUP BY day
ORDER BY message_count DESC
LIMIT 5;
`;
