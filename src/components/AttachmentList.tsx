import React from "react";

export interface AttachmentItem {
  id?: number;
  url: string;
  file_type?: string;
  mime_type?: string | null;
  file_size?: number | null;
}

export interface AttachmentListProps {
  attachments?: AttachmentItem[];
}

export function AttachmentList({ attachments }: AttachmentListProps) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "6px" }}>
      {attachments.map((att, idx) => {
        const isImage = att.mime_type?.startsWith("image/") || att.file_type === "image" || /\.(png|jpe?g|gif|webp)$/i.test(att.url);

        if (isImage) {
          return (
            <a key={att.id ?? idx} href={att.url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block" }}>
              <img
                src={att.url}
                alt="attachment"
                style={{ maxWidth: "200px", maxHeight: "150px", borderRadius: "6px", objectFit: "cover" }}
              />
            </a>
          );
        }

        return (
          <a
            key={att.id ?? idx}
            href={att.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 10px",
              backgroundColor: "rgba(0,0,0,0.05)",
              borderRadius: "4px",
              color: "inherit",
              textDecoration: "none",
              fontSize: "13px",
            }}
          >
            📎 {att.url.split("/").pop() || "Download File"}
          </a>
        );
      })}
    </div>
  );
}
