// $1 chat (chat_num)   $2 person (user_id)   $3 from
export const reactionMatrixQuery = `
SELECT
  rp.user_id  AS reactor_id,
  rp.name     AS reactor_name,
  sp.user_id  AS reacted_to_id,
  sp.name     AS reacted_to_name,
  COUNT(*)    AS reaction_count
FROM reactions AS r
JOIN messages AS m
  ON m.msg_id = r.target_msg_id
JOIN chats AS c
  ON c.chat_id = m.chat_id
JOIN people AS rp
  ON rp.user_id = r.reactor_id
JOIN people AS sp
  ON sp.user_id = m.msg_sender_id
WHERE ($1::int  IS NULL OR c.chat_num = $1)
  AND ($2::date IS NULL OR r.reaction_date >= $2::date)
  AND ($3::date IS NULL OR r.reaction_date <  $3::date + 1)
GROUP BY rp.user_id, sp.user_id
ORDER BY reaction_count DESC;
`;
