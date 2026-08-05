import db from "../client.ts";

export interface KBArticle {
  id: number;
  account_id: number;
  title: string;
  category?: string;
  content: string;
  keywords?: string[];
  created_at?: string;
  updated_at?: string;
}

/**
 * createKBArticle — VS-AI-002
 */
export async function createKBArticle(params: {
  accountId: number;
  title: string;
  category?: string;
  content: string;
  keywords?: string[];
}): Promise<KBArticle> {
  const keywordsLiteral = `{${(params.keywords ?? []).map((k) => `"${k.replace(/"/g, '\\"')}"`).join(",")}}`;
  const rows = await db.unsafe(
    `INSERT INTO knowledge_base_articles (account_id, title, category, content, keywords)
     VALUES ($1, $2, $3, $4, $5::text[])
     RETURNING id, account_id, title, category, content, keywords, created_at, updated_at`,
    [
      params.accountId,
      params.title,
      params.category ?? "General",
      params.content,
      keywordsLiteral,
    ]
  );
  return rows[0] as any;
}

/**
 * listKBArticles — VS-AI-002
 */
export async function listKBArticles(accountId: number): Promise<KBArticle[]> {
  const rows = await db.unsafe(
    `SELECT id, account_id, title, category, content, keywords, created_at, updated_at
     FROM knowledge_base_articles
     WHERE account_id = $1
     ORDER BY created_at DESC`,
    [accountId]
  );
  return rows as any;
}

/**
 * deleteKBArticle — VS-AI-002
 */
export async function deleteKBArticle(articleId: number, accountId: number): Promise<boolean> {
  const res = await db.unsafe(
    `DELETE FROM knowledge_base_articles WHERE id = $1 AND account_id = $2 RETURNING id`,
    [articleId, accountId]
  );
  return res.length > 0;
}

/**
 * searchRAGKnowledgeBase — VS-AI-002 (Retrieval-Augmented Generation)
 * Performs full-text / semantic keyword search across the Knowledge Base articles to retrieve context for LLM generation.
 */
export async function searchRAGKnowledgeBase(
  accountId: number,
  query: string
): Promise<{ contextSnippet: string; matchingArticles: KBArticle[] }> {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);

  // Search articles in account
  const articles = await listKBArticles(accountId);

  if (articles.length === 0) {
    return {
      contextSnippet: "No company knowledge base articles found.",
      matchingArticles: [],
    };
  }

  // Score articles based on term frequency in title, keywords, and content
  const scored = articles.map((article) => {
    let score = 0;
    const text = `${article.title} ${article.category} ${article.content} ${(article.keywords ?? []).join(" ")}`.toLowerCase();
    for (const word of words) {
      if (text.includes(word)) score += 1;
    }
    return { article, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const topMatches = scored.slice(0, 3).map((s) => s.article);

  const contextSnippet = topMatches
    .map((art) => `[Article: ${art.title}]\n${art.content}`)
    .join("\n\n");

  return {
    contextSnippet: contextSnippet || "No relevant documentation found for the query.",
    matchingArticles: topMatches,
  };
}
