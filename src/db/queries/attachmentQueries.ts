import db from "../client.ts";

export interface Attachment {
  id: number;
  message_id: number | null;
  account_id: number;
  url: string;
  file_type: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: Date;
}

export interface CreateAttachmentInput {
  account_id: number;
  message_id?: number | null;
  url: string;
  file_type?: string;
  mime_type?: string | null;
  file_size?: number | null;
}

export async function createAttachment(input: CreateAttachmentInput): Promise<Attachment> {
  const {
    account_id,
    message_id = null,
    url,
    file_type = "file",
    mime_type = null,
    file_size = null,
  } = input;

  const rows = await db.unsafe(
    `INSERT INTO attachments
       (account_id, message_id, url, file_type, mime_type, file_size)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [account_id, message_id, url, file_type, mime_type, file_size]
  );
  return rows[0] as Attachment;
}

export async function listAttachmentsByMessage(
  message_id: number,
  account_id: number
): Promise<Attachment[]> {
  const rows = await db.unsafe(
    `SELECT * FROM attachments WHERE message_id = $1 AND account_id = $2 ORDER BY created_at ASC`,
    [message_id, account_id]
  );
  return rows as Attachment[];
}

export async function linkAttachmentsToMessage(
  message_id: number,
  account_id: number,
  attachmentsInput: Array<{ url: string; file_type?: string; mime_type?: string; file_size?: number }>
): Promise<Attachment[]> {
  const createdList: Attachment[] = [];
  for (const item of attachmentsInput) {
    const att = await createAttachment({
      account_id,
      message_id,
      url: item.url,
      file_type: item.file_type ?? (item.mime_type?.startsWith("image/") ? "image" : "file"),
      mime_type: item.mime_type,
      file_size: item.file_size,
    });
    createdList.push(att);
  }
  return createdList;
}
