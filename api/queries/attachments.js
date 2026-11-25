export const attachmentQuery = `
SELECT a.filename
FROM attachments AS a
WHERE a.attachment_id = $1
`;
