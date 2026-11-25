// $1 chat (chat_num)   $2 person (user_id)   $3 from   $4 to
// $5 reactionType      $6 sort               $7 limit
export const messagesQuery = `
SELECT
    m.msg_id,
    m.msg_content,
    m.msg_date::date::text,
    LENGTH(m.msg_content)  AS msg_length,
    p.user_id              AS sender_id,
    p.name                 AS sender_name,
    c.chat_num             AS chat_num,
    c.display_name         AS chat_name,
    COUNT(r.reaction_id)::int   AS reaction_count,
    COALESCE(
        json_agg(
            json_build_object(
                'userId', rp.user_id,
                'name',   rp.name,
                'type',   r.reaction_type
            )
            ORDER BY r.reaction_date
        ) FILTER (WHERE r.reaction_id IS NOT NULL),
        '[]'
    ) AS reactors,
    (
        SELECT COALESCE(
            json_agg(
                json_build_object(
                    'attachmentId', a.attachment_id,
                    'mimeType',     a.mime_type,
                    'url',          '/api/attachments/' || a.attachment_id
                )
            ),
            '[]'
        )
        FROM attachments AS a
        WHERE a.msg_id = m.msg_id
    ) AS attachments
FROM messages AS m
JOIN people AS p
    ON p.user_id = m.msg_sender_id
JOIN chats AS c
    ON c.chat_id = m.chat_id
LEFT JOIN reactions AS r
    ON  r.target_msg_id = m.msg_id
    AND ($5::text IS NULL OR r.reaction_type = $5)
LEFT JOIN people AS rp
    ON rp.user_id = r.reactor_id
WHERE ($1::int  IS NULL OR c.chat_num = $1)
  AND ($2::int  IS NULL OR m.msg_sender_id = $2)
  AND ($3::date IS NULL OR m.msg_date >= $3::date)
  AND ($4::date IS NULL OR m.msg_date <  $4::date + 1)
GROUP BY
    m.msg_id,
    p.user_id,
    c.chat_id
ORDER BY
    CASE WHEN $6 = 'length'    THEN LENGTH(m.msg_content) END DESC NULLS LAST,
    CASE WHEN $6 = 'reactions' THEN COUNT(r.reaction_id)  END DESC,
    m.msg_date DESC
LIMIT $7; `;
