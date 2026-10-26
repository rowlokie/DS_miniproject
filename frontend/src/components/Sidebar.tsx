import React from 'react';
import { 
  LayoutDashboard, 
  Globe, 
  MessageSquare, 
  FileText, 
  BarChart3, 
  Settings, 
  Sparkles 
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  websitesCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange, websitesCount }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'crawler', label: 'Add Website', icon: Globe },
    { id: 'chat', label: 'AI Assistant', icon: MessageSquare },
    { id: 'explorer', label: 'Website Explorer', icon: FileText, badge: websitesCount > 0 ? websitesCount : undefined },
    { id: 'analytics', label: 'Web Mining & Stats', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 select-none">
      {/* Brand */}
      <div className="p-5 border-b border-slate-100 flex items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-semibold text-slate-900 text-sm tracking-tight leading-tight">
            WebMind RAG
          </h1>
          <p className="text-[11px] text-slate-600 font-medium tracking-wide">
            Intelligence Assistant
          </p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Academic Project Badge */}
      <div className="p-4 m-3 bg-slate-50 border border-slate-200/60 rounded-xl">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Web Data Mining Project</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
          Retrieval-Augmented Generation over Web Graph & Corpus
        </p>
      </div>
    </aside>
  );
};
