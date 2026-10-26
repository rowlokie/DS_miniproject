from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional, Dict, Any

class CrawlRequest(BaseModel):
    url: str = Field(..., description="Target website URL (e.g. https://docs.python.org)")
    max_pages: Optional[int] = Field(default=20, ge=1, le=100, description="Max pages to crawl")
    max_depth: Optional[int] = Field(default=2, ge=0, le=5, description="Max BFS depth")
    same_domain_only: Optional[bool] = Field(default=True, description="Constrain to root domain")
    chunk_size: Optional[int] = Field(default=600, ge=100, le=2000, description="Chunk character size")
    chunk_overlap: Optional[int] = Field(default=120, ge=0, le=500, description="Chunk overlap character size")

class CrawlJobStatusResponse(BaseModel):
    job_id: str
    website_id: Optional[int] = None
    root_url: str
    status: str # pending, running, completed, failed, cancelled
    total_discovered: int
    crawled_count: int
    failed_count: int
    current_url: Optional[str] = None
    current_stage: Optional[str] = None
    error_message: Optional[str] = None
    started_at: str
    completed_at: Optional[str] = None

class SourceCitation(BaseModel):
    url: str
    title: str
    excerpt: str
    similarity_score: float
    chunk_id: Optional[int] = None

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User question")
    website_id: Optional[int] = Field(None, description="Scope query to specific website or all")
    session_id: Optional[str] = Field("default", description="Conversation session ID")
    top_k: Optional[int] = Field(None, ge=1, le=10)
    similarity_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)

class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceCitation]
    insufficient_evidence: bool
    retrieval_count: int
    latency_ms: float
    session_id: str

class WebsiteSummary(BaseModel):
    id: int
    root_url: str
    domain: str
    title: Optional[str]
    total_pages: int
    total_chunks: int
    created_at: str
    updated_at: str

class PageSummary(BaseModel):
    id: int
    website_id: int
    url: str
    title: Optional[str]
    status: str
    status_code: Optional[int]
    depth: int
    word_count: int
    chunk_count: int
    text_content: Optional[str]
    error_message: Optional[str]
    crawled_at: str

class SettingsUpdate(BaseModel):
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None
    ollama_base_url: Optional[str] = None
    openai_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    chunk_size: Optional[int] = None
    chunk_overlap: Optional[int] = None
    top_k: Optional[int] = None
    similarity_threshold: Optional[float] = None
    max_crawl_pages: Optional[int] = None
    max_crawl_depth: Optional[int] = None

class AnalyticsResponse(BaseModel):
    total_websites: int
    total_pages: int
    total_chunks: int
    total_queries: int
    pages_by_status: Dict[str, int]
    top_keywords: List[Dict[str, Any]]
    frequent_questions: List[Dict[str, Any]]
    top_retrieved_sources: List[Dict[str, Any]]
    content_distribution: List[Dict[str, Any]]
