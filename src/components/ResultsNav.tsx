import { ChevronRight } from 'lucide-react';

export interface TabConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface ResultsNavProps {
  tabs: TabConfig[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function ResultsNav({ tabs, activeTab, onTabChange }: ResultsNavProps) {
  return (
    <div className="glass-card rounded-2xl p-2 mb-6 overflow-x-auto">
      <div className="flex gap-1 min-w-max">
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-mono font-medium transition-all-smooth whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-cyber-red/15 text-cyber-red border border-cyber-red/30'
                : 'text-cyber-text-dim hover:text-cyber-text hover:bg-cyber-bg/50 border border-transparent'
            }`}
          >
            <span className={`text-xs font-mono ${activeTab === tab.id ? 'text-cyber-red' : 'text-cyber-text-muted'}`}>
              {String(i + 1).padStart(2, '0')}
            </span>
            {tab.label}
            {activeTab === tab.id && <ChevronRight className="w-3 h-3" />}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ResultsPaginationProps {
  tabs: TabConfig[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function ResultsPagination({ tabs, activeTab, onTabChange }: ResultsPaginationProps) {
  const currentIndex = tabs.findIndex((t) => t.id === activeTab);
  const prev = currentIndex > 0 ? tabs[currentIndex - 1] : null;
  const next = currentIndex < tabs.length - 1 ? tabs[currentIndex + 1] : null;

  return (
    <div className="flex items-center justify-between gap-4 mt-6">
      <button
        onClick={() => prev && onTabChange(prev.id)}
        disabled={!prev}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyber-bg/50 border border-cyber-border text-cyber-text-dim text-sm font-mono hover:border-cyber-red/30 hover:text-cyber-text transition-all-smooth disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        {prev ? prev.label : 'Previous'}
      </button>
      <span className="text-cyber-text-muted text-xs font-mono">
        {currentIndex + 1} / {tabs.length}
      </span>
      <button
        onClick={() => next && onTabChange(next.id)}
        disabled={!next}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyber-red/10 border border-cyber-red/30 text-cyber-red text-sm font-mono hover:bg-cyber-red/20 transition-all-smooth disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {next ? next.label : 'Next'}
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
