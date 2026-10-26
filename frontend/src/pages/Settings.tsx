import React, { useState, useEffect } from 'react';
import { SystemSettings } from '../types';
import { api } from '../services/api';
import { 
  Settings as SettingsIcon, 
  Save, 
  Check, 
  Cpu, 
  Key, 
  Sliders, 
  Globe, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showKeys, setShowKeys] = useState(false);

  // Form states
  const [llmProvider, setLlmProvider] = useState('extractive');
  const [llmModel, setLlmModel] = useState('llama3');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [openaiKey, setOpenaiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [topK, setTopK] = useState(4);
  const [threshold, setThreshold] = useState(0.25);
  const [chunkSize, setChunkSize] = useState(600);
  const [chunkOverlap, setChunkOverlap] = useState(120);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const s = await api.getSettings();
        setSettings(s);
        setLlmProvider(s.llm_provider || 'extractive');
        setLlmModel(s.llm_model || 'llama3');
        setOllamaUrl(s.ollama_base_url || 'http://localhost:11434');
        setTopK(s.top_k || 4);
        setThreshold(s.similarity_threshold || 0.25);
        setChunkSize(s.chunk_size || 600);
        setChunkOverlap(s.chunk_overlap || 120);
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateSettings({
        llm_provider: llmProvider,
        llm_model: llmModel,
        ollama_base_url: ollamaUrl,
        openai_api_key: openaiKey || undefined,
        groq_api_key: groqKey || undefined,
        gemini_api_key: geminiKey || undefined,
        top_k: topK,
        similarity_threshold: threshold,
        chunk_size: chunkSize,
        chunk_overlap: chunkOverlap,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  if (loading || !settings) {
    return (
      <div className="p-12 text-center text-slate-400">
        <SettingsIcon className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
        <p className="text-xs">Loading configuration settings...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">System & Model Settings</h2>
        <p className="text-sm text-slate-500 mt-1">
          Configure the LLM inference provider, dense embedding model parameters, and vector retrieval thresholds.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* LLM Inference Provider Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-100">
            <Cpu className="w-4 h-4 text-indigo-600" />
            <h3 className="font-semibold text-slate-900 text-sm">LLM Generator Provider</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Active Provider
              </label>
              <select
                value={llmProvider}
                onChange={(e) => setLlmProvider(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                <option value="extractive">
                  Built-in Extractive Synthesis (Default - Zero API Key Needed, Always Works Offline)
                </option>
                <option value="ollama">Ollama (Local LLM - Llama 3, Mistral, Phi-3)</option>
                <option value="groq">Groq Cloud (Free Tier - Lightning Fast Llama 3.1 8B)</option>
                <option value="openai">OpenAI (GPT-4o-mini / GPT-4o)</option>
                <option value="gemini">Google Gemini (Gemini 1.5 Flash)</option>
              </select>
            </div>

            {/* Provider specific inputs */}
            {llmProvider === 'ollama' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ollama Base URL</label>
                  <input
                    type="text"
                    value={ollamaUrl}
                    onChange={(e) => setOllamaUrl(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ollama Model Name</label>
                  <input
                    type="text"
                    value={llmModel}
                    onChange={(e) => setLlmModel(e.target.value)}
                    placeholder="llama3"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            )}

            {llmProvider === 'groq' && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Groq API Key {settings.has_groq_key && <span className="text-emerald-600 font-normal">(Configured)</span>}
                  </label>
                  <input
                    type={showKeys ? 'text' : 'password'}
                    value={groqKey}
                    onChange={(e) => setGroqKey(e.target.value)}
                    placeholder={settings.has_groq_key ? '••••••••••••••••••••' : 'gsk_...'}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Model</label>
                  <input
                    type="text"
                    value={llmModel}
                    onChange={(e) => setLlmModel(e.target.value)}
                    placeholder="llama-3.1-8b-instant"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            )}

            {llmProvider === 'openai' && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    OpenAI API Key {settings.has_openai_key && <span className="text-emerald-600 font-normal">(Configured)</span>}
                  </label>
                  <input
                    type={showKeys ? 'text' : 'password'}
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder={settings.has_openai_key ? '••••••••••••••••••••' : 'sk-...'}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Model</label>
                  <input
                    type="text"
                    value={llmModel}
                    onChange={(e) => setLlmModel(e.target.value)}
                    placeholder="gpt-4o-mini"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            )}

            {llmProvider === 'gemini' && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Google Gemini API Key {settings.has_gemini_key && <span className="text-emerald-600 font-normal">(Configured)</span>}
                  </label>
                  <input
                    type={showKeys ? 'text' : 'password'}
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder={settings.has_gemini_key ? '••••••••••••••••••••' : 'AIzaSy...'}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="toggleKeys"
                checked={showKeys}
                onChange={(e) => setShowKeys(e.target.checked)}
                className="rounded text-indigo-600"
              />
              <label htmlFor="toggleKeys" className="text-xs text-slate-600 cursor-pointer">
                Reveal API Keys in plain text
              </label>
            </div>
          </div>
        </div>

        {/* Vector Retrieval & Chunking Hyperparameters */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-100">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <h3 className="font-semibold text-slate-900 text-sm">Retrieval & Embedding Parameters</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Top-K Retrieved Chunks: <span className="text-indigo-600 font-bold">{topK}</span>
              </label>
              <input
                type="range"
                min="1"
                max="8"
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <span className="text-[11px] text-slate-400">Number of highest-scoring chunks fed to generator</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cosine Similarity Threshold: <span className="text-indigo-600 font-bold">{threshold}</span>
              </label>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <span className="text-[11px] text-slate-400">Minimum score cutoff to eliminate hallucinations</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Chunk Size: <span className="text-indigo-600 font-bold">{chunkSize} chars</span>
              </label>
              <input
                type="range"
                min="200"
                max="1200"
                step="50"
                value={chunkSize}
                onChange={(e) => setChunkSize(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Chunk Overlap: <span className="text-indigo-600 font-bold">{chunkOverlap} chars</span>
              </label>
              <input
                type="range"
                min="0"
                max="300"
                step="20"
                value={chunkOverlap}
                onChange={(e) => setChunkOverlap(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center space-x-3">
          <button
            type="submit"
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-colors shadow-sm cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>

          {savedSuccess && (
            <span className="flex items-center space-x-1.5 text-xs text-emerald-600 font-semibold animate-in fade-in">
              <Check className="w-4 h-4" />
              <span>Settings updated successfully!</span>
            </span>
          )}
        </div>
      </form>
    </div>
  );
};
