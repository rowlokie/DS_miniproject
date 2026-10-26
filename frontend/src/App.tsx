import React, { useState, useEffect, useRef } from 'react';
import { Website, CrawlJob, ChatMessage } from './types';
import { api } from './services/api';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { Crawler } from './pages/Crawler';
import { Chat } from './pages/Chat';
import { Explorer } from './pages/Explorer';
import { Analytics } from './pages/Analytics';
import { SettingsPage } from './pages/Settings';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<number | null>(null);
  const [activeJob, setActiveJob] = useState<CrawlJob | null>(null);
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean>(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [totalQueries, setTotalQueries] = useState<number>(0);

  const pollIntervalRef = useRef<any>(null);

  // Fetch websites & health on initial mount
  const refreshWebsites = async () => {
    try {
      const data = await api.listWebsites();
      setWebsites(data);
      if (data.length > 0 && selectedWebsiteId === null) {
        setSelectedWebsiteId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch websites:', err);
    }
  };

  const checkHealth = async () => {
    try {
      await api.checkHealth();
      setIsBackendHealthy(true);
    } catch (err) {
      setIsBackendHealthy(false);
    }
  };

  useEffect(() => {
    refreshWebsites();
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load chat history when selected website changes
  useEffect(() => {
    const fetchChat = async () => {
      try {
        const history = await api.getChatHistory('default', selectedWebsiteId);
        setMessages(history);
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };
    fetchChat();
  }, [selectedWebsiteId]);

  // Crawl job polling
  useEffect(() => {
    if (activeJob && (activeJob.status === 'running' || activeJob.status === 'pending')) {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const updated = await api.getJobStatus(activeJob.job_id);
          setActiveJob(updated);
          if (updated.status === 'completed' || updated.status === 'failed' || updated.status === 'cancelled') {
            clearInterval(pollIntervalRef.current);
            refreshWebsites();
            if (updated.website_id) {
              setSelectedWebsiteId(updated.website_id);
            }
          }
        } catch (err) {
          console.error('Job polling error:', err);
          clearInterval(pollIntervalRef.current);
        }
      }, 1500);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [activeJob?.job_id, activeJob?.status]);

  // Handler: Start crawl
  const handleStartCrawl = async (params: {
    url: string;
    max_pages: number;
    max_depth: number;
    same_domain_only: boolean;
    chunk_size: number;
    chunk_overlap: number;
  }) => {
    const job = await api.startCrawl(params);
    setActiveJob(job);
  };

  // Handler: Cancel crawl
  const handleCancelJob = async (jobId: string) => {
    await api.cancelJob(jobId);
    if (activeJob) {
      setActiveJob({ ...activeJob, status: 'cancelled' });
    }
  };

  // Handler: Delete website
  const handleDeleteWebsite = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this indexed website and its vector embeddings?')) {
      await api.deleteWebsite(id);
      if (selectedWebsiteId === id) setSelectedWebsiteId(null);
      await refreshWebsites();
    }
  };

  // Handler: Ask question in Chat
  const handleAskQuestion = async (message: string, websiteId: number | null): Promise<ChatMessage> => {
    const userMsg: ChatMessage = { role: 'user', content: message };
    setMessages((prev) => [...prev, userMsg]);
    setTotalQueries((prev) => prev + 1);

    const res = await api.askQuestion({
      message,
      website_id: websiteId,
      session_id: 'default',
    });

    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: res.answer,
      sources: res.sources,
      insufficient_evidence: res.insufficient_evidence,
      latency_ms: res.latency_ms,
    };

    setMessages((prev) => [...prev, assistantMsg]);
    return assistantMsg;
  };

  // Handler: Clear chat history
  const handleClearHistory = async (websiteId: number | null) => {
    await api.clearChatHistory('default', websiteId);
    setMessages([]);
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans antialiased overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        websitesCount={websites.length}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          websites={websites}
          selectedWebsiteId={selectedWebsiteId}
          onSelectWebsite={setSelectedWebsiteId}
          onQuickCrawl={() => setCurrentTab('crawler')}
          isBackendHealthy={isBackendHealthy}
        />

        {/* Content View */}
        <main className="flex-1 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <Dashboard
              websites={websites}
              activeJob={activeJob}
              onNavigate={setCurrentTab}
              onDeleteWebsite={handleDeleteWebsite}
              onCancelJob={handleCancelJob}
              onSelectWebsiteForChat={(id) => {
                setSelectedWebsiteId(id);
                setCurrentTab('chat');
              }}
              onSelectWebsiteForExplorer={(id) => {
                setSelectedWebsiteId(id);
                setCurrentTab('explorer');
              }}
              totalQueries={totalQueries}
            />
          )}

          {currentTab === 'crawler' && (
            <Crawler
              onStartCrawl={handleStartCrawl}
              activeJob={activeJob}
              onCancelJob={handleCancelJob}
              onNavigateToChat={() => setCurrentTab('chat')}
            />
          )}

          {currentTab === 'chat' && (
            <Chat
              websites={websites}
              selectedWebsiteId={selectedWebsiteId}
              onSelectWebsite={setSelectedWebsiteId}
              onAskQuestion={handleAskQuestion}
              onClearHistory={handleClearHistory}
              messages={messages}
            />
          )}

          {currentTab === 'explorer' && (
            <Explorer
              websites={websites}
              selectedWebsiteId={selectedWebsiteId}
              onSelectWebsite={setSelectedWebsiteId}
              onNavigateToChat={() => setCurrentTab('chat')}
            />
          )}

          {currentTab === 'analytics' && (
            <Analytics
              websites={websites}
              selectedWebsiteId={selectedWebsiteId}
              onSelectWebsite={setSelectedWebsiteId}
            />
          )}

          {currentTab === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
};

export default App;
