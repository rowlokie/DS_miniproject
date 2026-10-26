import React from 'react';
import { Website, CrawlJob } from '../types';
import { 
  Globe, 
  FileText, 
  Layers, 
  MessageSquare, 
  ArrowUpRight, 
  Trash2, 
  Play, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertTriangle 
} from 'lucide-react';

interface DashboardProps {
  websites: Website[];
  activeJob: CrawlJob | null;
  onNavigate: (tab: string) => void;
  onDeleteWebsite: (id: number) => void;
  onCancelJob: (jobId: string) => void;
  onSelectWebsiteForChat: (id: number) => void;
  onSelectWebsiteForExplorer: (id: number) => void;
  totalQueries: number;
}

export const Dashboard: React.FC<DashboardProps> = ({
  websites,
  activeJob,
  onNavigate,
  onDeleteWebsite,
  onCancelJob,
  onSelectWebsiteForChat,
  onSelectWebsiteForExplorer,
  totalQueries
}) => {
  const totalPages = websites.reduce((acc, w) => acc + w.total_pages, 0);
  const totalChunks = websites.reduce((acc, w) => acc + w.total_chunks, 0);

  const stats = [
    { label: 'Websites Indexed', value: websites.length, icon: Globe, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Pages Crawled', value: totalPages, icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Knowledge Chunks', value: totalChunks, icon: Layers, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Questions Answered', value: totalQueries, icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Welcome & Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">System Overview</h2>
          <p className="text-sm text-slate-500 mt-1">
            Real-time status of your crawled web corpus, vector store, and RAG pipeline.
          </p>
        </div>
        <button
          onClick={() => onNavigate('crawler')}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm shadow-indigo-100 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>Crawl New Website</span>
        </button>
      </div>

      {/* Primary KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{s.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{s.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center ${s.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Active / Latest Crawl Job Alert */}
      {activeJob && (
        <div className={`p-5 rounded-2xl border ${
          activeJob.status === 'running' 
            ? 'bg-indigo-50/60 border-indigo-200' 
            : activeJob.status === 'completed'
            ? 'bg-emerald-50/60 border-emerald-200'
            : activeJob.status === 'cancelled'
            ? 'bg-amber-50/60 border-amber-200'
            : 'bg-rose-50/60 border-rose-200'
        } space-y-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {activeJob.status === 'running' && (
                <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
              )}
              {activeJob.status === 'completed' && (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              )}
              {activeJob.status === 'cancelled' && (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              )}
              {activeJob.status === 'failed' && (
                <XCircle className="w-5 h-5 text-rose-600" />
              )}
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Indexing Job: <span className="font-mono text-xs">{activeJob.root_url}</span>
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Stage: <span className="font-medium text-slate-800">{activeJob.current_stage || activeJob.status}</span>
                  {activeJob.current_url && ` • ${activeJob.current_url}`}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                activeJob.status === 'running'
                  ? 'bg-indigo-100 text-indigo-700'
                  : activeJob.status === 'completed'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {activeJob.status}
              </span>
              {activeJob.status === 'running' && (
                <button
                  onClick={() => onCancelJob(activeJob.job_id)}
                  className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold px-3 py-1 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                >
                  Cancel Crawl
                </button>
              )}
            </div>
          </div>

          {/* Counts */}
          <div className="flex items-center space-x-6 text-xs text-slate-600 pt-1">
            <span>Discovered: <strong className="text-slate-800">{activeJob.total_discovered}</strong></span>
            <span>Crawled: <strong className="text-emerald-700">{activeJob.crawled_count}</strong></span>
            <span>Failed: <strong className="text-rose-700">{activeJob.failed_count}</strong></span>
          </div>
        </div>
      )}

      {/* Indexed Websites Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 text-base">Indexed Websites</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Available knowledge domains for retrieval and question answering.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {websites.length} Sources
          </span>
        </div>

        {websites.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-800">No websites indexed yet</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Add your first public website or documentation URL to crawl its pages, generate vector embeddings, and start asking questions.
              </p>
            </div>
            <button
              onClick={() => onNavigate('crawler')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              Add Website Now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/70 text-slate-600 text-xs font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-5">Website Title / Domain</th>
                  <th className="py-3 px-5">Root URL</th>
                  <th className="py-3 px-5">Pages</th>
                  <th className="py-3 px-5">Chunks</th>
                  <th className="py-3 px-5">Indexed At</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {websites.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-5 font-medium text-slate-900">
                      <div className="flex items-center space-x-2">
                        <Globe className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="truncate max-w-xs">{w.title || w.domain}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-xs text-slate-500 font-mono">
                      <a 
                        href={w.root_url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="hover:text-indigo-600 hover:underline flex items-center space-x-1"
                      >
                        <span className="truncate max-w-xs">{w.root_url}</span>
                        <ArrowUpRight className="w-3 h-3 shrink-0" />
                      </a>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {w.total_pages} pages
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                        {w.total_chunks} chunks
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-xs text-slate-500">
                      {new Date(w.created_at).toLocaleString(undefined, { 
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                      })}
                    </td>
                    <td className="py-3.5 px-5 text-right space-x-2">
                      <button
                        onClick={() => onSelectWebsiteForExplorer(w.id)}
                        className="text-xs font-medium text-slate-600 hover:text-indigo-600 px-2 py-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Explore crawled pages and chunks"
                      >
                        Explorer
                      </button>
                      <button
                        onClick={() => onSelectWebsiteForChat(w.id)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50 transition-colors cursor-pointer"
                        title="Ask questions using this knowledge base"
                      >
                        Chat
                      </button>
                      <button
                        onClick={() => onDeleteWebsite(w.id)}
                        className="text-xs text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer inline-flex items-center"
                        title="Delete website & vector embeddings"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
