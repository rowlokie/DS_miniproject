import React, { useState, useEffect, useRef } from 'react';
import { Website, ChatMessage, SourceCitation } from '../types';
import { 
  Send, 
  Trash2, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Bot, 
  User, 
  Clock, 
  HelpCircle,
  AlertCircle,
  Layers,
  Copy,
  Check
} from 'lucide-react';

interface ChatProps {
  websites: Website[];
  selectedWebsiteId: number | null;
  onSelectWebsite: (id: number | null) => void;
  onAskQuestion: (message: string, websiteId: number | null) => Promise<ChatMessage>;
  onClearHistory: (websiteId: number | null) => Promise<void>;
  messages: ChatMessage[];
}

export const Chat: React.FC<ChatProps> = ({
  websites,
  selectedWebsiteId,
  onSelectWebsite,
  onAskQuestion,
  onClearHistory,
  messages
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState<{ [key: string]: boolean }>({});
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeWebsite = websites.find((w) => w.id === selectedWebsiteId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const toggleSource = (key: string) => {
    setExpandedSources((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleSend = async (textToSend?: string) => {
    const question = (textToSend || input).trim();
    if (!question || isLoading) return;

    setInput('');
    setIsLoading(true);
    try {
      await onAskQuestion(question, selectedWebsiteId);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const starterQuestions = [
    activeWebsite 
      ? `What is the main topic covered in ${activeWebsite.title || activeWebsite.domain}?`
      : 'What websites have been indexed and what topics do they cover?',
    'Summarize the key information and purpose of this website.',
    'What features or tools are documented here?',
    'What are the requirements or getting-started instructions?'
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-5xl mx-auto w-full p-6 space-y-4">
      {/* Top Banner & Knowledge Scope */}
      <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-semibold text-slate-900">
                {activeWebsite ? (activeWebsite.title || activeWebsite.domain) : 'All Indexed Knowledge Bases'}
              </h3>
              <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">
                Strict Grounded RAG
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {activeWebsite 
                ? `Answers grounded strictly in ${activeWebsite.total_pages} crawled pages (${activeWebsite.total_chunks} chunks)`
                : `Retrieving across all ${websites.length} indexed websites`}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {messages.length > 0 && (
            <button
              onClick={() => onClearHistory(selectedWebsiteId)}
              className="flex items-center space-x-1.5 text-xs text-slate-500 hover:text-rose-600 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages Thread Container */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
              <Sparkles className="w-7 h-7" />
            </div>
            <div className="max-w-md">
              <h3 className="text-base font-bold text-slate-900">Ask Natural-Language Questions</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                The assistant performs dense vector search, retrieves the most relevant website excerpts, and synthesizes answers with source citations.
              </p>
            </div>

            {/* Suggested Prompts */}
            <div className="w-full max-w-lg space-y-2 pt-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Suggested Questions</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {starterQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q)}
                    className="p-3 bg-slate-50 hover:bg-indigo-50/60 hover:border-indigo-200 border border-slate-200/70 rounded-xl text-xs text-slate-700 hover:text-indigo-900 transition-all cursor-pointer text-left leading-snug"
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={idx}
                className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  isUser ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div className={`max-w-2xl space-y-3 ${isUser ? 'items-end' : ''}`}>
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-slate-50 text-slate-800 border border-slate-200/60 rounded-tl-none'
                  }`}>
                    {/* Render message body */}
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {!isUser && (
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/60 text-[11px] text-slate-600">
                        <div className="flex items-center space-x-2">
                          {msg.latency_ms !== undefined && (
                            <span className="flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>{Math.round(msg.latency_ms)}ms</span>
                            </span>
                          )}
                          {msg.sources && msg.sources.length > 0 && (
                            <span className="flex items-center space-x-1 text-indigo-700 font-semibold">
                              <Layers className="w-3 h-3" />
                              <span>{msg.sources.length} sources retrieved</span>
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => handleCopy(msg.content, idx)}
                          className="hover:text-slate-700 transition-colors cursor-pointer flex items-center space-x-1"
                        >
                          {copiedIdx === idx ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-600">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Insufficient Evidence Warning Banner */}
                  {!isUser && msg.insufficient_evidence && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        The indexed website content did not contain sufficient evidence to answer this query factually.
                      </span>
                    </div>
                  )}

                  {/* Retrieved Source Citations */}
                  {!isUser && msg.sources && msg.sources.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 flex items-center space-x-1">
                        <span>Source Citations & Evidence:</span>
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {msg.sources.map((src, sIdx) => {
                          const key = `${idx}-${sIdx}`;
                          const isExpanded = !!expandedSources[key];
                          return (
                            <div
                              key={sIdx}
                              className="bg-white border border-slate-200/90 rounded-xl p-3 text-xs shadow-2xs space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2 truncate">
                                  <span className="font-semibold text-slate-800 truncate">
                                    [{sIdx + 1}] {src.title || 'Source Document'}
                                  </span>
                                  <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                                    {Math.round(src.similarity_score * 100)}% match
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2 shrink-0">
                                  <a
                                    href={src.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-slate-400 hover:text-indigo-600 transition-colors"
                                    title="Open original webpage in new tab"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                  <button
                                    onClick={() => toggleSource(key)}
                                    className="text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                                  >
                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>

                              <p className="text-[11px] text-slate-500 font-mono truncate">
                                {src.url}
                              </p>

                              {/* Expandable Excerpt */}
                              {isExpanded && (
                                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-700 text-xs italic font-serif leading-relaxed mt-1">
                                  "{src.excerpt}"
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl rounded-tl-none space-y-2">
              <div className="flex items-center space-x-2 text-xs text-indigo-600 font-medium">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>Searching vector database & synthesizing grounded answer...</span>
              </div>
              <div className="flex space-x-1.5 pt-1">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              activeWebsite
                ? `Ask anything about ${activeWebsite.title || activeWebsite.domain}...`
                : 'Ask a question across all indexed websites...'
            }
            className="flex-1 px-4 py-2 text-sm text-slate-900 bg-transparent focus:outline-none placeholder:text-slate-400"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white p-2.5 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
