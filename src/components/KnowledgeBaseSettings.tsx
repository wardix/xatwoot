import React, { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore.ts";

const API_HOST = import.meta.env.VITE_API_HOST ?? "http://localhost:3000";

interface KBArticle {
  id: number;
  title: string;
  category?: string;
  content: string;
}

export function KnowledgeBaseSettings() {
  const token = useAuthStore((s) => s.token);
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchArticles();
  }, [token]);

  async function fetchArticles() {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_HOST}/api/v1/conversations/knowledge-base`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setArticles(data);
      }
    } catch {
      /* fetch failed */
    } finally {
      setLoading(false);
    }
  }

  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !token) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_HOST}/api/v1/conversations/knowledge-base`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          category: category.trim(),
          content: content.trim(),
        }),
      });
      if (res.ok) {
        setTitle("");
        setContent("");
        fetchArticles();
      }
    } catch {
      /* create failed */
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteArticle = async (id: number) => {
    if (!token) return;
    try {
      await fetch(`${API_HOST}/api/v1/conversations/knowledge-base/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchArticles();
    } catch {
      /* delete failed */
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h3 style={{ margin: "0 0 8px", color: "#111827" }}>🧠 AI Knowledge Base & RAG Context</h3>
      <p style={{ color: "#6b7280", fontSize: "14px", margin: "0 0 20px" }}>
        Upload company articles and documentation to empower AI auto-replies with accurate context.
      </p>

      {/* Article Creation Form */}
      <form
        onSubmit={handleCreateArticle}
        style={{
          backgroundColor: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div style={{ fontWeight: 600, fontSize: "14px", color: "#374151" }}>Add Knowledge Base Article</div>
        <div style={{ display: "flex", gap: "12px" }}>
          <input
            type="text"
            placeholder="Article Title (e.g., Refund & Return Policy)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", flex: 1 }}
            required
          />
          <input
            type="text"
            placeholder="Category (e.g., Billing)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", width: "160px" }}
          />
        </div>
        <textarea
          placeholder="Detailed Article Content / Documentation..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontFamily: "inherit" }}
          required
        />
        <button
          type="submit"
          disabled={saving}
          style={{
            alignSelf: "flex-start",
            backgroundColor: "#8b5cf6",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            padding: "8px 16px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {saving ? "Saving..." : "+ Save Article"}
        </button>
      </form>

      {/* Article List */}
      <div style={{ fontWeight: 600, fontSize: "15px", marginBottom: "12px" }}>Uploaded Knowledge Base Articles</div>
      {loading ? (
        <div style={{ color: "#6b7280" }}>Loading documentation...</div>
      ) : articles.length === 0 ? (
        <div style={{ color: "#9ca3af", fontSize: "14px" }}>No articles uploaded yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {articles.map((art) => (
            <div
              key={art.id}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "12px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: "#111827" }}>
                  {art.title} <span style={{ fontSize: "11px", backgroundColor: "#f3f4f6", color: "#6b7280", padding: "2px 6px", borderRadius: "4px" }}>{art.category}</span>
                </div>
                <div style={{ fontSize: "13px", color: "#4b5563", marginTop: "4px", whiteSpace: "pre-wrap" }}>
                  {art.content.slice(0, 150)}...
                </div>
              </div>
              <button
                onClick={() => handleDeleteArticle(art.id)}
                style={{
                  backgroundColor: "#fee2e2",
                  color: "#ef4444",
                  border: "none",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
