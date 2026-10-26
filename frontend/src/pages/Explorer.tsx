import React, { useState, useEffect } from 'react';
import { Website, CrawledPage, PageChunk } from '../types';
import { api } from '../services/api';
import { 
  FileText, 
  Search, 
  ExternalLink, 
  Layers, 
  CheckCircle, 
  XCircle, 
  Eye, 
  X, 
  Clock, 
  Database,
  ArrowRight
} from 'lucide-react';

interface ExplorerProps {
  websites: Website[];
  selectedWebsiteId: number | null;
  onSelectWebsite: (id: number | null) => void;
  onNavigateToChat: () => void;
}

export const Explorer: React.FC<ExplorerProps> = ({
  websites,
  selectedWebsiteId,
  onSelectWebsite,
  onNavigateToChat
}) => {
  const [pages, setPages] = useState<CrawledPage[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [selectedPage, setSelectedPage] = useState<CrawledPage | null>(null);
  const [pageChunks, setPageChunks] = useState<PageChunk[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [inspectTab, setInspectTab] = useState<'text' | 'chunks'>('text');

  // Load pages when selected website changes
  useEffect(() => {
    const fetchPages = async () => {
      if (!selectedWebsiteId) {
        if (websites.length > 0) {
          onSelectWebsite(websites[0].id);
        }
        return;
      }
      try {
        const data = await api.getWebsitePages(selectedWebsiteId);
        setPages(data);
      } catch (err) {
        console.error('Failed to load pages:', err);
      }
    };
    fetchPages();
  }, [selectedWebsiteId, websites]);

  // Load chunks when a page is inspected
  const handleInspectPage = async (page: CrawledPage) => {
    setSelectedPage(page);
    setLoadingChunks(true);
    try {
      const chunks = await api.getPageChunks(page.id);
      setPageChunks(chunks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingChunks(false);
    }
  };

  const filteredPages = pages.filter((p) => {
    const matchesSearch = (p.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeWebsite = websites.find((w) => w.id === selectedWebsiteId);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Website Knowledge Explorer</h2>
          <p className="text-sm text-slate-500 mt-1">
            Audit how original web pages were converted into cleaned structured text and vector search chunks.
          </p>
        </div>

        {/* Website Selector */}
        <div className="flex items-center space-x-3">
          <label className="text-xs font-semibold text-slate-600">Select Website:</label>
          <select
            value={selectedWebsiteId || ''}
            onChange={(e) => onSelectWebsite(Number(e.target.value))}
            className="bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2 shadow-xs cursor-pointer focus:ring-2 focus:ring-indigo-500/20"
          >
            {websites.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title || w.domain} ({w.total_pages} pages)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search pages by title or URL..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center space-x-2">
          {(['all', 'success', 'failed'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg capitalize transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Pages Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredPages.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-600">No pages matched your criteria</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting the search query or select another website.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/70 text-slate-600 text-xs font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-5">Page Title</th>
                  <th className="py-3 px-5">URL</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Depth</th>
                  <th className="py-3 px-5">Words</th>
                  <th className="py-3 px-5">Chunks</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredPages.map((page) => (
                  <tr key={page.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-5 font-medium text-slate-900 max-w-xs truncate">
                      {page.title || 'Untitled Page'}
                    </td>
                    <td className="py-3.5 px-5 font-mono text-xs text-slate-500 max-w-xs truncate">
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-indigo-600 hover:underline flex items-center space-x-1"
                      >
                        <span className="truncate">{page.url}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </td>
                    <td className="py-3.5 px-5">
                      {page.status === 'success' ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <CheckCircle className="w-3 h-3" />
                          <span>{page.status_code || 200} OK</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-100">
                          <XCircle className="w-3 h-3" />
                          <span>Failed</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-xs text-slate-500">{page.depth}</td>
                    <td className="py-3.5 px-5 text-xs font-medium text-slate-800">{page.word_count}</td>
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700">
                        {page.chunk_count}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => handleInspectPage(page)}
                        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/80 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Page Inspection Drawer / Modal */}
      {selectedPage && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
              <div className="space-y-1 pr-6">
                <h3 className="font-bold text-slate-900 text-base">{selectedPage.title || 'Page Details'}</h3>
                <p className="font-mono text-xs text-slate-500 break-all">{selectedPage.url}</p>
              </div>
              <button
                onClick={() => setSelectedPage(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Subnav: Text vs Chunks */}
            <div className="px-6 pt-3 border-b border-slate-100 flex space-x-4 text-xs font-semibold">
              <button
                onClick={() => setInspectTab('text')}
                className={`pb-2.5 border-b-2 transition-colors cursor-pointer ${
                  inspectTab === 'text'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Cleaned Page Content ({selectedPage.word_count} words)
              </button>
              <button
                onClick={() => setInspectTab('chunks')}
                className={`pb-2.5 border-b-2 transition-colors cursor-pointer ${
                  inspectTab === 'chunks'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Vector Chunks ({pageChunks.length})
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {inspectTab === 'text' ? (
                selectedPage.text_content ? (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-800 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                    {selectedPage.text_content}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No text extracted for this page.</p>
                )
              ) : (
                <div className="space-y-3">
                  {loadingChunks ? (
                    <p className="text-xs text-slate-500">Loading vector chunks...</p>
                  ) : pageChunks.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No chunks created for this page.</p>
                  ) : (
                    pageChunks.map((chunk, idx) => (
                      <div
                        key={chunk.id}
                        className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                          <span className="text-indigo-600">Chunk #{chunk.chunk_index + 1}</span>
                          <span className="text-slate-400">~{chunk.token_count} tokens</span>
                        </div>
                        <p className="text-xs text-slate-800 font-sans leading-relaxed whitespace-pre-wrap">
                          {chunk.text}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setSelectedPage(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
