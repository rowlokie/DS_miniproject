import React from 'react';
import { Website } from '../types';
import { Plus, CheckCircle2, AlertCircle } from 'lucide-react';

interface HeaderProps {
  websites: Website[];
  selectedWebsiteId: number | null;
  onSelectWebsite: (id: number | null) => void;
  onQuickCrawl: () => void;
  isBackendHealthy: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  websites,
  selectedWebsiteId,
  onSelectWebsite,
  onQuickCrawl,
  isBackendHealthy
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
      {/* Knowledge Scope Selector */}
      <div className="flex items-center space-x-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
          Knowledge Base:
        </label>
        <select
          value={selectedWebsiteId === null ? '' : selectedWebsiteId}
          onChange={(e) => {
            const val = e.target.value;
            onSelectWebsite(val === '' ? null : Number(val));
          }}
          className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
        >
          <option value="">All Indexed Websites ({websites.length})</option>
          {websites.map((w) => (
            <option key={w.id} value={w.id}>
              {w.title || w.domain} ({w.total_pages} pages, {w.total_chunks} chunks)
            </option>
          ))}
        </select>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-4">
        {/* Backend health */}
        <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">
          {isBackendHealthy ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>RAG Engine Ready</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>Connecting to Backend...</span>
            </>
          )}
        </div>

        {/* Crawl Action */}
        <button
          onClick={onQuickCrawl}
          className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Index Website</span>
        </button>
      </div>
    </header>
  );
};
