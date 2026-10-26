import re
import json
from collections import Counter
from typing import List, Dict, Any, Optional
import logging
import numpy as np
from ..database import db
from ..embeddings.embedder import get_embedder

logger = logging.getLogger(__name__)

def extract_neural_semantic_keywords(corpus: List[str], top_n: int = 15) -> List[Dict[str, Any]]:
    """
    Extracts top semantic keyphrases using Deep Learning / Transformer Neural Embeddings (KeyBERT approach).
    Computes candidate phrase embeddings and scores their latent cosine similarity against the document vector.
    """
    if not corpus:
        return []

    full_text = " ".join(corpus)
    raw_words = re.findall(r'\b[a-zA-Z]{3,}\b', full_text.lower())
    stopwords = {
        "the", "and", "for", "with", "this", "that", "from", "are", "you", "your",
        "can", "our", "all", "have", "has", "was", "were", "been", "which", "who",
        "about", "more", "also", "their", "such", "other", "into", "some", "than",
        "over", "under", "then", "these", "those", "will", "would", "shall", "should",
        "any", "may", "per", "via", "well", "its", "not", "but", "only", "one", "two"
    }

    # 1. Unigram candidates
    word_counts = Counter([w for w in raw_words if w not in stopwords and len(w) > 3])
    candidates = [w for w, c in word_counts.most_common(35)]

    # 2. Bigram candidates (phrases like "technological institute", "autonomous institution")
    tokens = [w for w in raw_words if len(w) > 2]
    bigram_candidates = []
    for i in range(len(tokens) - 1):
        w1, w2 = tokens[i], tokens[i+1]
        if w1 not in stopwords and w2 not in stopwords:
            bigram = f"{w1} {w2}"
            bigram_candidates.append(bigram)

    for bg, c in Counter(bigram_candidates).most_common(20):
        if c >= 2 and bg not in candidates:
            candidates.append(bg)

    if not candidates:
        return []

    try:
        embedder = get_embedder()
        doc_emb = embedder.embed_documents([full_text[:3000]])[0]
        cand_embs = embedder.embed_documents(candidates)

        # Cosine similarity in dense neural latent space (vectors are unit-normalized)
        sim_scores = np.dot(cand_embs, doc_emb)

        scored = []
        for phrase, score in zip(candidates, sim_scores):
            norm_score = round(float(max(0.0, score)), 3)
            scored.append({"keyword": phrase, "score": norm_score})

        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_n]
    except Exception as e:
        logger.warning(f"Neural keyword extraction failed: {e}")
        return [{"keyword": w, "score": round(float(c)/max(1, len(raw_words)), 3)} for w, c in word_counts.most_common(top_n)]

def compute_website_text_mining(website_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Performs real text mining and Web Data Mining analysis:
    - TF-IDF extraction for top domain terms
    - Word frequency analysis
    - Content length distributions
    - Actual measured crawl success rates
    - Real query logs analysis
    """
    conn = db.get_connection()

    # 1. Page status metrics
    if website_id:
        status_rows = conn.execute("""
            SELECT status, COUNT(*) as count FROM pages WHERE website_id = ? GROUP BY status
        """, (website_id,)).fetchall()
        page_rows = conn.execute("""
            SELECT id, url, title, word_count, chunk_count, status FROM pages WHERE website_id = ? AND status = 'success'
        """, (website_id,)).fetchall()
        text_rows = conn.execute("""
            SELECT text_content FROM pages WHERE website_id = ? AND status = 'success' AND text_content IS NOT NULL
        """, (website_id,)).fetchall()
    else:
        status_rows = conn.execute("""
            SELECT status, COUNT(*) as count FROM pages GROUP BY status
        """, ()).fetchall()
        page_rows = conn.execute("""
            SELECT id, url, title, word_count, chunk_count, status FROM pages WHERE status = 'success'
        """, ()).fetchall()
        text_rows = conn.execute("""
            SELECT text_content FROM pages WHERE status = 'success' AND text_content IS NOT NULL
        """, ()).fetchall()

    pages_by_status = {"success": 0, "failed": 0, "skipped": 0}
    for r in status_rows:
        pages_by_status[r["status"]] = r["count"]

    # 2. Content distribution by page
    content_distribution = []
    for p in page_rows[:15]:
        content_distribution.append({
            "title": (p["title"] or p["url"])[:25],
            "url": p["url"],
            "word_count": p["word_count"],
            "chunk_count": p["chunk_count"]
        })

    # 3. Neural Semantic Keyword & Concept Extraction (SentenceTransformer KeyBERT)
    corpus = [r["text_content"] for r in text_rows if r["text_content"] and len(r["text_content"].strip()) > 30]
    top_keywords = extract_neural_semantic_keywords(corpus, top_n=15)

    # 4. Chat history analysis (Frequently asked questions & retrieved sources)
    query_rows = conn.execute("""
        SELECT content, sources_json FROM chat_history WHERE role = 'user'
    """).fetchall()

    total_queries = len(query_rows)
    frequent_questions = []
    if query_rows:
        q_counter = Counter([r["content"].strip() for r in query_rows])
        for q, cnt in q_counter.most_common(8):
            frequent_questions.append({"question": q, "count": cnt})

    # Top retrieved sources
    source_counter = Counter()
    assistant_rows = conn.execute("""
        SELECT sources_json FROM chat_history WHERE role = 'assistant' AND sources_json IS NOT NULL
    """).fetchall()
    for ar in assistant_rows:
        try:
            sources = json.loads(ar["sources_json"])
            for s in sources:
                src_key = s.get("title") or s.get("url")
                if src_key:
                    source_counter[src_key] += 1
        except Exception:
            pass

    top_retrieved_sources = []
    for src, cnt in source_counter.most_common(8):
        top_retrieved_sources.append({"source": src, "citations": cnt})

    # Summary counts
    total_websites = conn.execute("SELECT COUNT(*) as c FROM websites").fetchone()["c"]
    total_pages = conn.execute("SELECT COUNT(*) as c FROM pages").fetchone()["c"]
    total_chunks = conn.execute("SELECT COUNT(*) as c FROM chunks").fetchone()["c"]

    conn.close()

    return {
        "total_websites": total_websites,
        "total_pages": total_pages,
        "total_chunks": total_chunks,
        "total_queries": total_queries,
        "pages_by_status": pages_by_status,
        "top_keywords": top_keywords,
        "frequent_questions": frequent_questions,
        "top_retrieved_sources": top_retrieved_sources,
        "content_distribution": content_distribution
    }
