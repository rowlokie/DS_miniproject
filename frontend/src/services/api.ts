import {
  Website,
  CrawledPage,
  PageChunk,
  CrawlJob,
  ChatMessage,
  AnalyticsData,
  SystemSettings
} from '../types';

const API_BASE = '/api';

export const api = {
  // Health
  checkHealth: async () => {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },

  // Crawling
  startCrawl: async (data: {
    url: string;
    max_pages?: number;
    max_depth?: number;
    same_domain_only?: boolean;
    chunk_size?: number;
    chunk_overlap?: number;
  }): Promise<CrawlJob> => {
    const res = await fetch(`${API_BASE}/crawl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to start crawl' }));
      throw new Error(err.detail || 'Crawl failed to start');
    }
    return res.json();
  },

  getJobStatus: async (jobId: string): Promise<CrawlJob> => {
    const res = await fetch(`${API_BASE}/jobs/${jobId}`);
    if (!res.ok) throw new Error('Job not found');
    return res.json();
  },

  cancelJob: async (jobId: string) => {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/cancel`, { method: 'POST' });
    return res.json();
  },

  // Websites
  listWebsites: async (): Promise<Website[]> => {
    const res = await fetch(`${API_BASE}/websites`);
    return res.json();
  },

  getWebsite: async (id: number): Promise<Website> => {
    const res = await fetch(`${API_BASE}/websites/${id}`);
    return res.json();
  },

  deleteWebsite: async (id: number) => {
    const res = await fetch(`${API_BASE}/websites/${id}`, { method: 'DELETE' });
    return res.json();
  },

  getWebsitePages: async (websiteId: number): Promise<CrawledPage[]> => {
    const res = await fetch(`${API_BASE}/websites/${websiteId}/pages`);
    return res.json();
  },

  getPageChunks: async (pageId: number): Promise<PageChunk[]> => {
    const res = await fetch(`${API_BASE}/pages/${pageId}/chunks`);
    return res.json();
  },

  // Chat
  askQuestion: async (params: {
    message: string;
    website_id?: number | null;
    session_id?: string;
    top_k?: number;
    similarity_threshold?: number;
  }): Promise<{
    answer: string;
    sources: any[];
    insufficient_evidence: boolean;
    retrieval_count: number;
    latency_ms: number;
    session_id: string;
  }> => {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Chat error' }));
      throw new Error(err.detail || 'Failed to process question');
    }
    return res.json();
  },

  getChatHistory: async (sessionId: string = 'default', websiteId?: number | null): Promise<ChatMessage[]> => {
    const url = new URL(`${window.location.origin}${API_BASE}/chat/history`);
    url.searchParams.set('session_id', sessionId);
    if (websiteId) url.searchParams.set('website_id', websiteId.toString());
    const res = await fetch(url.toString());
    return res.json();
  },

  clearChatHistory: async (sessionId: string = 'default', websiteId?: number | null) => {
    const url = new URL(`${window.location.origin}${API_BASE}/chat/clear`);
    url.searchParams.set('session_id', sessionId);
    if (websiteId) url.searchParams.set('website_id', websiteId.toString());
    const res = await fetch(url.toString(), { method: 'POST' });
    return res.json();
  },

  // Analytics
  getAnalytics: async (websiteId?: number | null): Promise<AnalyticsData> => {
    const url = new URL(`${window.location.origin}${API_BASE}/analytics`);
    if (websiteId) url.searchParams.set('website_id', websiteId.toString());
    const res = await fetch(url.toString());
    return res.json();
  },

  // Settings
  getSettings: async (): Promise<SystemSettings> => {
    const res = await fetch(`${API_BASE}/settings`);
    return res.json();
  },

  updateSettings: async (settings: Partial<SystemSettings>) => {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.json();
  },
};
