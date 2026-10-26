import uuid
import threading
from typing import List, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query

from ..config import settings
from ..schemas.models import (
    CrawlRequest, CrawlJobStatusResponse, ChatRequest, ChatResponse,
    WebsiteSummary, PageSummary, SettingsUpdate, AnalyticsResponse
)
from ..crawler.pipeline import run_indexing_pipeline
from ..crawler.crawler import is_safe_url
from ..rag.generator import RAGGenerator
from ..analytics.text_mining import compute_website_text_mining
from ..database import db

router = APIRouter()
rag_generator = RAGGenerator()

@router.get("/health")
def health_check():
    """Health check endpoint reporting system status."""
    return {
        "status": "healthy",
        "llm_provider": settings.llm_provider,
        "embedding_model": settings.embedding_model_name,
        "database": "sqlite_connected"
    }

@router.post("/crawl", response_model=CrawlJobStatusResponse)
def start_crawl(req: CrawlRequest, background_tasks: BackgroundTasks):
    """
    Validates URL, checks SSRF safety, and triggers background crawling and indexing.
    """
    safe, reason = is_safe_url(req.url)
    if not safe:
        raise HTTPException(status_code=400, detail=reason)

    job_id = str(uuid.uuid4())
    
    # Run pipeline in a background worker thread
    thread = threading.Thread(
        target=run_indexing_pipeline,
        kwargs={
            "root_url": req.url,
            "max_pages": req.max_pages or settings.max_crawl_pages,
            "max_depth": req.max_depth or settings.max_crawl_depth,
            "same_domain_only": req.same_domain_only if req.same_domain_only is not None else True,
            "chunk_size": req.chunk_size or settings.chunk_size,
            "chunk_overlap": req.chunk_overlap or settings.chunk_overlap,
            "job_id": job_id
        },
        daemon=True
    )
    thread.start()

    return CrawlJobStatusResponse(
        job_id=job_id,
        root_url=req.url,
        status="running",
        total_discovered=1,
        crawled_count=0,
        failed_count=0,
        current_stage="Initiating crawl job",
        started_at=db.datetime.utcnow().isoformat()
    )

@router.get("/jobs/{job_id}", response_model=CrawlJobStatusResponse)
def get_job_status(job_id: str):
    """Retrieves real-time crawling and indexing status."""
    job = db.get_crawl_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return CrawlJobStatusResponse(
        job_id=job["id"],
        website_id=job.get("website_id"),
        root_url=job["root_url"],
        status=job["status"],
        total_discovered=job.get("total_discovered", 0),
        crawled_count=job.get("crawled_count", 0),
        failed_count=job.get("failed_count", 0),
        current_url=job.get("current_url"),
        current_stage=job.get("current_stage"),
        error_message=job.get("error_message"),
        started_at=job["started_at"],
        completed_at=job.get("completed_at")
    )

@router.post("/jobs/{job_id}/cancel")
def cancel_job(job_id: str):
    """Requests cancellation of a running crawl job."""
    job = db.get_crawl_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.update_crawl_job(job_id, status="cancelled", current_stage="Cancelled by user")
    return {"status": "cancelled", "job_id": job_id}

@router.get("/websites", response_model=List[WebsiteSummary])
def list_websites():
    """Lists all indexed websites with page and chunk metrics."""
    return db.list_all_websites()

@router.get("/websites/{website_id}", response_model=WebsiteSummary)
def get_website(website_id: int):
    """Retrieves a single indexed website."""
    site = db.get_website_by_id(website_id)
    if not site:
        raise HTTPException(status_code=404, detail="Website not found")
    return site

@router.delete("/websites/{website_id}")
def delete_website(website_id: int):
    """Deletes indexed website, its pages, chunks, and vector store data."""
    site = db.get_website_by_id(website_id)
    if not site:
        raise HTTPException(status_code=404, detail="Website not found")
    
    # Delete from vector store
    from ..vector_store.store import get_vector_store
    get_vector_store().delete_website_vectors(website_id)
    
    # Delete from DB
    db.delete_website_records(website_id)
    return {"status": "deleted", "website_id": website_id}

@router.get("/websites/{website_id}/pages", response_model=List[PageSummary])
def get_website_pages(website_id: int, limit: int = 100, offset: int = 0):
    """Lists crawled pages for a given website."""
    return db.get_website_pages(website_id, limit=limit, offset=offset)

@router.get("/pages/{page_id}/chunks")
def get_page_chunks(page_id: int):
    """Returns chunks generated from a specific webpage."""
    return db.get_page_chunks(page_id)

@router.post("/chat", response_model=ChatResponse)
def ask_question(req: ChatRequest):
    """
    RAG Chat endpoint:
    Retrieves most relevant chunks from vector database, feeds grounded context to LLM,
    and returns answer with source citations.
    """
    return rag_generator.answer_question(
        query=req.message,
        website_id=req.website_id,
        session_id=req.session_id or "default",
        top_k=req.top_k,
        similarity_threshold=req.similarity_threshold
    )

@router.get("/chat/history")
def get_chat_history(session_id: str = "default", website_id: Optional[int] = None):
    """Retrieves conversation history for a session."""
    return db.get_chat_history(session_id=session_id, website_id=website_id)

@router.post("/chat/clear")
def clear_chat_history(session_id: str = "default", website_id: Optional[int] = None):
    """Clears conversation history."""
    db.clear_chat_history(session_id=session_id, website_id=website_id)
    return {"status": "cleared", "session_id": session_id}

@router.get("/analytics", response_model=AnalyticsResponse)
def get_analytics(website_id: Optional[int] = None):
    """
    Returns actual Web Data Mining metrics:
    TF-IDF terms, keyword frequency, page statuses, content distributions.
    """
    return compute_website_text_mining(website_id=website_id)

@router.get("/settings")
def get_settings():
    """Returns current active settings."""
    return {
        "llm_provider": settings.llm_provider,
        "llm_model": settings.llm_model,
        "ollama_base_url": settings.ollama_base_url,
        "embedding_model": settings.embedding_model_name,
        "chunk_size": settings.chunk_size,
        "chunk_overlap": settings.chunk_overlap,
        "top_k": settings.top_k,
        "similarity_threshold": settings.similarity_threshold,
        "max_crawl_pages": settings.max_crawl_pages,
        "max_crawl_depth": settings.max_crawl_depth,
        "has_openai_key": bool(settings.openai_api_key),
        "has_groq_key": bool(settings.groq_api_key),
        "has_gemini_key": bool(settings.gemini_api_key)
    }

@router.post("/settings")
def update_settings(update: SettingsUpdate):
    """Updates configuration settings."""
    if update.llm_provider is not None:
        settings.llm_provider = update.llm_provider
    if update.llm_model is not None:
        settings.llm_model = update.llm_model
    if update.ollama_base_url is not None:
        settings.ollama_base_url = update.ollama_base_url
    if update.openai_api_key is not None:
        settings.openai_api_key = update.openai_api_key
    if update.groq_api_key is not None:
        settings.groq_api_key = update.groq_api_key
    if update.gemini_api_key is not None:
        settings.gemini_api_key = update.gemini_api_key
    if update.chunk_size is not None:
        settings.chunk_size = update.chunk_size
    if update.chunk_overlap is not None:
        settings.chunk_overlap = update.chunk_overlap
    if update.top_k is not None:
        settings.top_k = update.top_k
    if update.similarity_threshold is not None:
        settings.similarity_threshold = update.similarity_threshold
    if update.max_crawl_pages is not None:
        settings.max_crawl_pages = update.max_crawl_pages
    if update.max_crawl_depth is not None:
        settings.max_crawl_depth = update.max_crawl_depth

    return {"status": "updated", "settings": get_settings()}
