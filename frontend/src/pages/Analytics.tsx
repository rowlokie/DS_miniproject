import React, { useState, useEffect } from 'react';
import { AnalyticsData, Website } from '../types';
import { api } from '../services/api';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  FileText, 
  Tag, 
  HelpCircle, 
  Layers, 
  Award,
  Info
} from 'lucide-react';

interface AnalyticsProps {
  websites: Website[];
  selectedWebsiteId: number | null;
  onSelectWebsite: (id: number | null) => void;
}

export const Analytics: React.FC<AnalyticsProps> = ({
  websites,
  selectedWebsiteId,
  onSelectWebsite
}) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await api.getAnalytics(selectedWebsiteId);
        setData(res);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [selectedWebsiteId]);

  if (loading || !data) {
    return (
      <div className="p-12 text-center text-slate-500">
        <BarChart3 className="w-8 h-8 animate-pulse text-indigo-600 mx-auto mb-2" />
        <p className="text-sm font-semibold">Computing Neural Semantic Analytics & Transformer Embeddings...</p>
      </div>
    );
  }

  // Data for Status Pie Chart
  const statusData = [
    { name: 'Successful Pages', value: data.pages_by_status.success || 0, color: '#10b981' },
    { name: 'Failed Pages', value: data.pages_by_status.failed || 0, color: '#f43f5e' },
    { name: 'Skipped Pages', value: data.pages_by_status.skipped || 0, color: '#94a3b8' },
  ].filter(d => d.value > 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Web Data Mining & Retrieval Analytics
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Empirical text mining metrics: Neural Transformer Semantic Embeddings (KeyBERT), corpus lengths, and query citations.
          </p>
        </div>

        {/* Scope selector */}
        <div className="flex items-center space-x-3">
          <label className="text-xs font-semibold text-slate-600">Analytics Scope:</label>
          <select
            value={selectedWebsiteId || ''}
            onChange={(e) => onSelectWebsite(e.target.value ? Number(e.target.value) : null)}
            className="bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2 shadow-xs cursor-pointer focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">All Websites Combined</option>
            {websites.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title || w.domain}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Pages Crawled</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{data.total_pages}</p>
          <span className="text-[11px] text-emerald-600 font-medium">Actual crawler responses</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Vector Chunks</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{data.total_chunks}</p>
          <span className="text-[11px] text-indigo-600 font-medium">Dense 384d vectors indexed</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">User Questions Answered</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{data.total_queries}</p>
          <span className="text-[11px] text-purple-600 font-medium">Grounded RAG inferences</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Crawl Success Rate</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {data.total_pages > 0
              ? `${Math.round(((data.pages_by_status.success || 0) / data.total_pages) * 100)}%`
              : '100%'}
          </p>
          <span className="text-[11px] text-slate-500">HTTP 200 vs failed fetches</span>
        </div>
      </div>

      {/* Primary Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Neural Semantic Concepts Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Top Neural Semantic Concepts</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Key concepts extracted via SentenceTransformer neural embeddings and latent cosine similarity.
              </p>
            </div>
            <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg">
              Neural Similarity
            </span>
          </div>

          {data.top_keywords.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400 italic">
              No textual documents available for neural semantic extraction yet.
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.top_keywords.slice(0, 10)} layout="vertical" margin={{ left: 30, right: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 1]} />
                  <YAxis type="category" dataKey="keyword" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip
                    formatter={(val: any) => [`${val}`, 'Neural Semantic Similarity']}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="score" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Content Length Distribution by Page */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Content Distribution by Page</h3>
              <p className="text-xs text-slate-500 mt-0.5">Word counts per extracted webpage</p>
            </div>
            <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg">
              Word Count
            </span>
          </div>

          {data.content_distribution.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400 italic">
              No crawled pages indexed yet.
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.content_distribution.slice(0, 8)} margin={{ bottom: 20 }}>
                  <XAxis dataKey="title" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: any) => [`${val} words`, 'Extracted Words']}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="word_count" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Secondary Tables: Questions Asked & Top Retrieved Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Most Retrieved Sources */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center space-x-2">
            <Award className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-slate-900 text-sm">Most Retrieved Knowledge Sources</h3>
          </div>
          <p className="text-xs text-slate-500">
            Pages whose chunks provided the highest cosine similarity during chat retrieval.
          </p>

          {data.top_retrieved_sources.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">
              No retrieval queries recorded yet. Ask questions in the Chat to see citation stats.
            </p>
          ) : (
            <div className="space-y-2.5 pt-2">
              {data.top_retrieved_sources.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs">
                  <span className="font-medium text-slate-800 truncate max-w-xs">{s.source}</span>
                  <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full shrink-0">
                    {s.citations} citations
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Frequent Queries */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center space-x-2">
            <HelpCircle className="w-4 h-4 text-purple-500" />
            <h3 className="font-bold text-slate-900 text-sm">Query History Log</h3>
          </div>
          <p className="text-xs text-slate-500">
            Actual user questions submitted to the RAG pipeline.
          </p>

          {data.frequent_questions.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">
              No questions asked yet. Start a chat conversation!
            </p>
          ) : (
            <div className="space-y-2.5 pt-2">
              {data.frequent_questions.map((q, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs">
                  <span className="text-slate-800 italic truncate max-w-xs">"{q.question}"</span>
                  <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full shrink-0">
                    {q.count}x
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
