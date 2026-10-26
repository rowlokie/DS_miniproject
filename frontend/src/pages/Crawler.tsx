import React, { useState } from 'react';
import { CrawlJob } from '../types';
import { 
  Globe, 
  ShieldCheck, 
  Play, 
  StopCircle, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Layers, 
  Sparkles, 
  Database, 
  ArrowRight,
  Info
} from 'lucide-react';

interface CrawlerProps {
  onStartCrawl: (params: {
    url: string;
    max_pages: number;
    max_depth: number;
    same_domain_only: boolean;
    chunk_size: number;
    chunk_overlap: number;
  }) => Promise<void>;
  activeJob: CrawlJob | null;
  onCancelJob: (jobId: string) => void;
  onNavigateToChat: () => void;
}

export const Crawler: React.FC<CrawlerProps> = ({
  onStartCrawl,
  activeJob,
  onCancelJob,
  onNavigateToChat
}) => {
  const [url, setUrl] = useState('https://docs.python.org/3/tutorial/index.html');
  const [maxPages, setMaxPages] = useState(10);
  const [maxDepth, setMaxDepth] = useState(2);
  const [sameDomain, setSameDomain] = useState(true);
  const [chunkSize, setChunkSize] = useState(600);
  const [chunkOverlap, setChunkOverlap] = useState(120);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmed = url.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setValidationError('URL must start with http:// or https://');
      return;
    }

    if (trimmed.includes('localhost') || trimmed.includes('127.0.0.1')) {
      setValidationError('Localhost and loopback IPs are blocked for security (SSRF prevention).');
      return;
    }

    try {
      setIsSubmitting(true);
      await onStartCrawl({
        url: trimmed,
        max_pages: maxPages,
        max_depth: maxDepth,
        same_domain_only: sameDomain,
        chunk_size: chunkSize,
        chunk_overlap: chunkOverlap
      });
    } catch (err: any) {
      setValidationError(err.message || 'Failed to start crawl.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pipeline stages calculation
  const getStageStatus = (stageIdx: number) => {
    if (!activeJob) return 'pending';
    if (activeJob.status === 'completed') return 'completed';
    if (activeJob.status === 'failed') return 'failed';

    const stage = activeJob.current_stage?.toLowerCase() || '';
    if (stageIdx === 1) return 'completed'; // URL & SSRF
    if (stageIdx === 2) {
      if (stage.includes('crawl')) return 'active';
      if (stage.includes('preprocess') || stage.includes('embedding') || stage.includes('index')) return 'completed';
      return 'pending';
    }
    if (stageIdx === 3) {
      if (stage.includes('preprocess')) return 'active';
      if (stage.includes('embedding') || stage.includes('index')) return 'completed';
      return 'pending';
    }
    if (stageIdx === 4) {
      if (stage.includes('embedding') || stage.includes('vector')) return 'active';
      if (stage.includes('complete')) return 'completed';
      return 'pending';
    }
    if (stageIdx === 5) {
      if (stage.includes('complete')) return 'completed';
      return 'pending';
    }
    return 'pending';
  };

  const stages = [
    { idx: 1, name: 'SSRF & URL Validation', desc: 'Verify safe domain & protocol', icon: ShieldCheck },
    { idx: 2, name: 'Controlled Web Crawler', desc: 'BFS traversal & robots.txt check', icon: Globe },
    { idx: 3, name: 'Boilerplate Stripping & Preprocessing', desc: 'DOM cleaning & structured chunking', icon: Layers },
    { idx: 4, name: 'Dense Vector Embeddings', desc: 'all-MiniLM-L6-v2 transformer encoding', icon: Sparkles },
    { idx: 5, name: 'Knowledge Indexing & Storage', desc: 'SQLite & persistent vector similarity store', icon: Database },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Index Website Knowledge</h2>
        <p className="text-sm text-slate-500 mt-1">
          Provide any public documentation or website URL. The engine will discover pages, extract text, and build vector embeddings for grounded RAG QA.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Crawler Form */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                Target Website URL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Globe className="w-4 h-4" />
                </div>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  disabled={activeJob?.status === 'running'}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
                <span>Protected by SSRF firewall. Localhost and private subnets are blocked.</span>
              </p>
            </div>

            {/* Quick preset suggestions */}
            <div>
              <span className="text-xs text-slate-500 font-medium">Quick Test Suggestions:</span>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {[
                  'https://vjti.ac.in/',
                  'https://docs.python.org/3/tutorial/index.html',
                  'https://fastapi.tiangolo.com/tutorial/',
                  'https://en.wikipedia.org/wiki/Web_mining'
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setUrl(preset)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-mono transition-colors cursor-pointer"
                  >
                    {preset.replace('https://', '').split('/')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Config Sliders & Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Max Pages to Crawl: <span className="text-indigo-600 font-bold">{maxPages}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={maxPages}
                  onChange={(e) => setMaxPages(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                  disabled={activeJob?.status === 'running'}
                />
                <span className="text-[11px] text-slate-400">Controls crawling limit</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Max Crawl Depth: <span className="text-indigo-600 font-bold">{maxDepth}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="4"
                  value={maxDepth}
                  onChange={(e) => setMaxDepth(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                  disabled={activeJob?.status === 'running'}
                />
                <span className="text-[11px] text-slate-400">0 = root page only; 2 = link depth 2</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chunk Size: <span className="text-indigo-600 font-bold">{chunkSize} chars</span>
                </label>
                <input
                  type="range"
                  min="200"
                  max="1200"
                  step="50"
                  value={chunkSize}
                  onChange={(e) => setChunkSize(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                  disabled={activeJob?.status === 'running'}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chunk Overlap: <span className="text-indigo-600 font-bold">{chunkOverlap} chars</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="300"
                  step="20"
                  value={chunkOverlap}
                  onChange={(e) => setChunkOverlap(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                  disabled={activeJob?.status === 'running'}
                />
              </div>
            </div>

            {/* Same domain checkbox */}
            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="sameDomain"
                checked={sameDomain}
                onChange={(e) => setSameDomain(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 accent-indigo-600 cursor-pointer"
                disabled={activeJob?.status === 'running'}
              />
              <label htmlFor="sameDomain" className="text-xs font-medium text-slate-700 cursor-pointer">
                Restrict crawler strictly to the same root domain (recommended)
              </label>
            </div>

            {validationError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 pt-3">
              {activeJob?.status === 'running' ? (
                <button
                  type="button"
                  onClick={() => onCancelJob(activeJob.job_id)}
                  className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm cursor-pointer"
                >
                  <StopCircle className="w-4 h-4" />
                  <span>Cancel Crawl Job</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-all shadow-sm shadow-indigo-100 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{isSubmitting ? 'Starting...' : 'Start Crawl & Indexing'}</span>
                </button>
              )}

              {activeJob?.status === 'completed' && (
                <button
                  type="button"
                  onClick={onNavigateToChat}
                  className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  <span>Chat With This Website</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Live Pipeline Visualizer */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 text-sm">Indexing Pipeline</h3>
              {activeJob && (
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                  activeJob.status === 'running' ? 'bg-indigo-100 text-indigo-700' :
                  activeJob.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {activeJob.status}
                </span>
              )}
            </div>

            <div className="space-y-4">
              {stages.map((stg) => {
                const status = getStageStatus(stg.idx);
                const Icon = stg.icon;
                return (
                  <div key={stg.idx} className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                      status === 'active' ? 'bg-indigo-100 text-indigo-600 animate-pulse' :
                      status === 'failed' ? 'bg-rose-100 text-rose-600' :
                      'bg-slate-100 text-slate-400'
                    }`}>
                      {status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <h4 className={`text-xs font-semibold ${
                        status === 'active' ? 'text-indigo-600' : 
                        status === 'completed' ? 'text-slate-900' : 'text-slate-500'
                      }`}>
                        {stg.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        {stg.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Crawler Details Footer */}
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Embedding Engine:</span>
              <strong className="text-slate-800">all-MiniLM-L6-v2 (384d)</strong>
            </div>
            <div className="flex justify-between">
              <span>Vector Similarity:</span>
              <strong className="text-slate-800">Cosine Distance</strong>
            </div>
            <div className="flex justify-between">
              <span>Politeness Delay:</span>
              <strong className="text-slate-800">200ms / request</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
