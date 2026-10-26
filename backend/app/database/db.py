import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from ..config import DB_PATH

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Websites table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS websites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        root_url TEXT UNIQUE NOT NULL,
        domain TEXT NOT NULL,
        title TEXT,
        total_pages INTEGER DEFAULT 0,
        total_chunks INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    # Pages table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        website_id INTEGER NOT NULL,
        url TEXT NOT NULL,
        title TEXT,
        status TEXT NOT NULL, -- success, failed, skipped
        status_code INTEGER,
        depth INTEGER DEFAULT 0,
        word_count INTEGER DEFAULT 0,
        chunk_count INTEGER DEFAULT 0,
        text_content TEXT,
        error_message TEXT,
        crawled_at TEXT NOT NULL,
        FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE,
        UNIQUE (website_id, url)
    );
    """)

    # Chunks table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        website_id INTEGER NOT NULL,
        page_id INTEGER NOT NULL,
        chunk_index INTEGER NOT NULL,
        text TEXT NOT NULL,
        token_count INTEGER DEFAULT 0,
        url TEXT NOT NULL,
        title TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE,
        FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
    );
    """)

    # Crawl Jobs table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS crawl_jobs (
        id TEXT PRIMARY KEY,
        website_id INTEGER,
        root_url TEXT NOT NULL,
        status TEXT NOT NULL, -- pending, running, completed, failed, cancelled
        total_discovered INTEGER DEFAULT 0,
        crawled_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        current_url TEXT,
        current_stage TEXT,
        error_message TEXT,
        started_at TEXT NOT NULL,
        completed_at TEXT
    );
    """)

    # Chat history table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        website_id INTEGER,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL, -- user, assistant
        content TEXT NOT NULL,
        sources_json TEXT,
        latency_ms REAL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE SET NULL
    );
    """)

    # Settings table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
    """)

    conn.commit()
    conn.close()

# Helper DB accessors
def get_website_by_url(root_url: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    row = conn.execute("SELECT * FROM websites WHERE root_url = ?", (root_url,)).fetchone()
    conn.close()
    return dict(row) if row else None

def get_website_by_id(website_id: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    row = conn.execute("SELECT * FROM websites WHERE id = ?", (website_id,)).fetchone()
    conn.close()
    return dict(row) if row else None

def list_all_websites() -> List[Dict[str, Any]]:
    conn = get_connection()
    rows = conn.execute("SELECT * FROM websites ORDER BY updated_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

def upsert_website(root_url: str, domain: str, title: str) -> int:
    conn = get_connection()
    now = datetime.utcnow().isoformat()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO websites (root_url, domain, title, total_pages, total_chunks, created_at, updated_at)
        VALUES (?, ?, ?, 0, 0, ?, ?)
        ON CONFLICT(root_url) DO UPDATE SET
            title = excluded.title,
            updated_at = excluded.updated_at
    """, (root_url, domain, title, now, now))
    conn.commit()
    website_id = cursor.lastrowid
    if not website_id or website_id == 0:
        row = cursor.execute("SELECT id FROM websites WHERE root_url = ?", (root_url,)).fetchone()
        website_id = row["id"]
    conn.close()
    return website_id

def delete_website_records(website_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM chunks WHERE website_id = ?", (website_id,))
    cursor.execute("DELETE FROM pages WHERE website_id = ?", (website_id,))
    cursor.execute("DELETE FROM chat_history WHERE website_id = ?", (website_id,))
    cursor.execute("DELETE FROM websites WHERE id = ?", (website_id,))
    conn.commit()
    conn.close()

def insert_page(website_id: int, url: str, title: str, status: str, status_code: Optional[int],
                depth: int, word_count: int, chunk_count: int, text_content: str, error_message: str = "") -> int:
    conn = get_connection()
    now = datetime.utcnow().isoformat()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO pages (website_id, url, title, status, status_code, depth, word_count, chunk_count, text_content, error_message, crawled_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(website_id, url) DO UPDATE SET
            title = excluded.title,
            status = excluded.status,
            status_code = excluded.status_code,
            depth = excluded.depth,
            word_count = excluded.word_count,
            chunk_count = excluded.chunk_count,
            text_content = excluded.text_content,
            error_message = excluded.error_message,
            crawled_at = excluded.crawled_at
    """, (website_id, url, title, status, status_code, depth, word_count, chunk_count, text_content, error_message, now))
    conn.commit()
    page_id = cursor.lastrowid
    if not page_id or page_id == 0:
        row = cursor.execute("SELECT id FROM pages WHERE website_id = ? AND url = ?", (website_id, url)).fetchone()
        page_id = row["id"]
    conn.close()
    return page_id

def insert_chunk(website_id: int, page_id: int, chunk_index: int, text: str, token_count: int, url: str, title: str) -> int:
    conn = get_connection()
    now = datetime.utcnow().isoformat()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO chunks (website_id, page_id, chunk_index, text, token_count, url, title, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (website_id, page_id, chunk_index, text, token_count, url, title, now))
    conn.commit()
    cid = cursor.lastrowid
    conn.close()
    return cid

def update_website_stats(website_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    row_pages = cursor.execute("SELECT COUNT(*) as count FROM pages WHERE website_id = ? AND status = 'success'", (website_id,)).fetchone()
    row_chunks = cursor.execute("SELECT COUNT(*) as count FROM chunks WHERE website_id = ?", (website_id,)).fetchone()
    now = datetime.utcnow().isoformat()
    cursor.execute("""
        UPDATE websites SET total_pages = ?, total_chunks = ?, updated_at = ? WHERE id = ?
    """, (row_pages["count"], row_chunks["count"], now, website_id))
    conn.commit()
    conn.close()

def get_website_pages(website_id: int, limit: int = 200, offset: int = 0) -> List[Dict[str, Any]]:
    conn = get_connection()
    rows = conn.execute("""
        SELECT id, website_id, url, title, status, status_code, depth, word_count, chunk_count, text_content, error_message, crawled_at
        FROM pages WHERE website_id = ? ORDER BY id ASC LIMIT ? OFFSET ?
    """, (website_id, limit, offset)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_page_chunks(page_id: int) -> List[Dict[str, Any]]:
    conn = get_connection()
    rows = conn.execute("SELECT * FROM chunks WHERE page_id = ? ORDER BY chunk_index ASC", (page_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

# Crawl Job management
def create_crawl_job(job_id: str, website_id: Optional[int], root_url: str):
    conn = get_connection()
    now = datetime.utcnow().isoformat()
    conn.execute("""
        INSERT INTO crawl_jobs (id, website_id, root_url, status, total_discovered, crawled_count, failed_count, current_stage, started_at)
        VALUES (?, ?, ?, 'running', 1, 0, 0, 'Discovering pages', ?)
    """, (job_id, website_id, root_url, now))
    conn.commit()
    conn.close()

def update_crawl_job(job_id: str, **kwargs):
    conn = get_connection()
    clauses = []
    params = []
    for k, v in kwargs.items():
        clauses.append(f"{k} = ?")
        params.append(v)
    params.append(job_id)
    conn.execute(f"UPDATE crawl_jobs SET {', '.join(clauses)} WHERE id = ?", params)
    conn.commit()
    conn.close()

def get_crawl_job(job_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    row = conn.execute("SELECT * FROM crawl_jobs WHERE id = ?", (job_id,)).fetchone()
    conn.close()
    return dict(row) if row else None

# Chat History
def save_chat_message(website_id: Optional[int], session_id: str, role: str, content: str,
                      sources: Optional[List[Dict[str, Any]]] = None, latency_ms: float = 0.0) -> int:
    conn = get_connection()
    now = datetime.utcnow().isoformat()
    sources_str = json.dumps(sources) if sources else None
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO chat_history (website_id, session_id, role, content, sources_json, latency_ms, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (website_id, session_id, role, content, sources_str, latency_ms, now))
    conn.commit()
    mid = cursor.lastrowid
    conn.close()
    return mid

def get_chat_history(session_id: str, website_id: Optional[int] = None, limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_connection()
    if website_id:
        rows = conn.execute("""
            SELECT * FROM chat_history WHERE session_id = ? AND website_id = ? ORDER BY id ASC LIMIT ?
        """, (session_id, website_id, limit)).fetchall()
    else:
        rows = conn.execute("""
            SELECT * FROM chat_history WHERE session_id = ? ORDER BY id ASC LIMIT ?
        """, (session_id, limit)).fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        if d.get("sources_json"):
            try:
                d["sources"] = json.loads(d["sources_json"])
            except Exception:
                d["sources"] = []
        else:
            d["sources"] = []
        result.append(d)
    return result

def clear_chat_history(session_id: str, website_id: Optional[int] = None):
    conn = get_connection()
    if website_id:
        conn.execute("DELETE FROM chat_history WHERE session_id = ? AND website_id = ?", (session_id, website_id))
    else:
        conn.execute("DELETE FROM chat_history WHERE session_id = ?", (session_id,))
    conn.commit()
    conn.close()
