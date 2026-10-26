import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

# Load .env if present
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")

DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
VECTOR_DIR = DATA_DIR / "vectors"
VECTOR_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "rag_assistant.db"

class Settings(BaseModel):
    # Crawling
    max_crawl_pages: int = int(os.getenv("MAX_CRAWL_PAGES", "20"))
    max_crawl_depth: int = int(os.getenv("MAX_CRAWL_DEPTH", "2"))
    request_timeout: int = int(os.getenv("REQUEST_TIMEOUT", "10"))
    politeness_delay: float = float(os.getenv("POLITENESS_DELAY", "0.2"))
    respect_robots_txt: bool = os.getenv("RESPECT_ROBOTS_TXT", "true").lower() == "true"
    max_page_size_bytes: int = 2 * 1024 * 1024 # 2MB

    # Preprocessing & Chunking
    chunk_size: int = int(os.getenv("CHUNK_SIZE", "600"))
    chunk_overlap: int = int(os.getenv("CHUNK_OVERLAP", "120"))

    # Vector & Retrieval
    embedding_model_name: str = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    top_k: int = int(os.getenv("TOP_K", "4"))
    similarity_threshold: float = float(os.getenv("SIMILARITY_THRESHOLD", "0.25"))

    # LLM Settings
    # options: "extractive", "ollama", "openai", "groq", "gemini"
    llm_provider: str = os.getenv("LLM_PROVIDER", "extractive")
    llm_model: str = os.getenv("LLM_MODEL", "llama3")
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")

# Global singleton settings
settings = Settings()
