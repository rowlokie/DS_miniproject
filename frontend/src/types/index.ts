export interface Website {
  id: number;
  root_url: string;
  domain: string;
  title: string | null;
  total_pages: number;
  total_chunks: number;
  created_at: string;
  updated_at: string;
}

export interface CrawledPage {
  id: number;
  website_id: number;
  url: string;
  title: string | null;
  status: 'success' | 'failed' | 'skipped';
  status_code: number | null;
  depth: number;
  word_count: number;
  chunk_count: number;
  text_content: string | null;
  error_message: string | null;
  crawled_at: string;
}

export interface PageChunk {
  id: number;
  website_id: number;
  page_id: number;
  chunk_index: number;
  text: string;
  token_count: number;
  url: string;
  title: string;
  created_at: string;
}

export interface CrawlJob {
  job_id: string;
  website_id?: number | null;
  root_url: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  total_discovered: number;
  crawled_count: number;
  failed_count: number;
  current_url?: string | null;
  current_stage?: string | null;
  error_message?: string | null;
  started_at: string;
  completed_at?: string | null;
}

export interface SourceCitation {
  url: string;
  title: string;
  excerpt: string;
  similarity_score: number;
  chunk_id?: number;
}

export interface ChatMessage {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceCitation[];
  insufficient_evidence?: boolean;
  latency_ms?: number;
  created_at?: string;
}

export interface AnalyticsData {
  total_websites: number;
  total_pages: number;
  total_chunks: number;
  total_queries: number;
  pages_by_status: { [key: string]: number };
  top_keywords: { keyword: string; score: number }[];
  frequent_questions: { question: string; count: number }[];
  top_retrieved_sources: { source: string; citations: number }[];
  content_distribution: { title: string; url: string; word_count: number; chunk_count: number }[];
}

export interface SystemSettings {
  llm_provider: string;
  llm_model: string;
  ollama_base_url: string;
  embedding_model: string;
  chunk_size: number;
  chunk_overlap: number;
  top_k: number;
  similarity_threshold: number;
  max_crawl_pages: number;
  max_crawl_depth: number;
  has_openai_key?: boolean;
  has_groq_key?: boolean;
  has_gemini_key?: boolean;
  openai_api_key?: string;
  groq_api_key?: string;
  gemini_api_key?: string;
}
