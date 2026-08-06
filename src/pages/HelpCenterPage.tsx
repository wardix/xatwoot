import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

const API_HOST = import.meta.env.VITE_API_HOST ?? "http://localhost:3000";

interface KBArticle {
  id: number;
  title: string;
  category: string;
  content: string;
}

export function HelpCenterPage() {
  const { accountId = "1" } = useParams();
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<KBArticle | null>(null);

  useEffect(() => {
    fetchArticles("");
  }, [accountId]);

  const fetchArticles = async (query: string) => {
    setLoading(true);
    try {
      const url = `${API_HOST}/api/v1/helpcenter/${accountId}${query ? `?search=${encodeURIComponent(query)}` : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles ?? []);
      }
    } catch {
      /* fetch failed */
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchArticles(search);
  };

  // Group articles by category
  const categories = Array.from(new Set(articles.map((a) => a.category || "General")));

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb", fontFamily: "sans-serif" }}>
      {/* Header Banner */}
      <header style={{ backgroundColor: "#2563eb", color: "#ffffff", padding: "40px 20px", textAlign: "center" }}>
        <h1 style={{ margin: "0 0 12px", fontSize: "28px", fontWeight: 800 }}>📖 Public Help Center</h1>
        <p style={{ margin: "0 0 24px", fontSize: "15px", opacity: 0.9 }}>
          How can we help you today? Search our knowledge base articles.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} style={{ maxWidth: "540px", margin: "0 auto", display: "flex", gap: "8px" }}>
          <input
            type="text"
            placeholder="Search for articles, guides, or answers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: "8px",
              border: "none",
              fontSize: "14px",
              outline: "none",
            }}
          />
          <button
            type="submit"
            style={{
              backgroundColor: "#1e40af",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "12px 20px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Search
          </button>
        </form>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: "900px", margin: "30px auto", padding: "0 20px" }}>
        {selectedArticle ? (
          <div style={{ backgroundColor: "#ffffff", padding: "24px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
            <button
              onClick={() => setSelectedArticle(null)}
              style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "14px", marginBottom: "16px" }}
            >
              ← Back to all articles
            </button>
            <div style={{ fontSize: "12px", color: "#2563eb", fontWeight: 700, textTransform: "uppercase" }}>
              {selectedArticle.category}
            </div>
            <h2 style={{ margin: "8px 0 16px", fontSize: "22px", color: "#111827" }}>{selectedArticle.title}</h2>
            <div style={{ fontSize: "14px", lineHeight: "1.6", color: "#374151", whiteSpace: "pre-wrap" }}>
              {selectedArticle.content}
            </div>
          </div>
        ) : loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>Loading help articles...</div>
        ) : articles.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>No articles found. Try a different search query!</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            {categories.map((cat) => (
              <section key={cat}>
                <h3 style={{ fontSize: "18px", color: "#111827", marginBottom: "12px", borderBottom: "2px solid #e5e7eb", paddingBottom: "6px" }}>
                  📁 {cat}
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" }}>
                  {articles
                    .filter((a) => (a.category || "General") === cat)
                    .map((art) => (
                      <div
                        key={art.id}
                        onClick={() => setSelectedArticle(art)}
                        style={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          padding: "16px",
                          cursor: "pointer",
                          transition: "box-shadow 0.2s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)")}
                        onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
                      >
                        <h4 style={{ margin: "0 0 8px", fontSize: "15px", color: "#1d4ed8" }}>{art.title}</h4>
                        <p style={{ margin: 0, fontSize: "13px", color: "#6b7280", lineClamp: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {art.content}
                        </p>
                      </div>
                    ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
