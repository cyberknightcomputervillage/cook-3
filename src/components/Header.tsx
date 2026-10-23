import React from 'react';
import { HardDrive, Download, UploadCloud, Terminal, ShieldAlert, FolderKanban } from 'lucide-react';

interface HeaderProps {
  activeTab: 'vault' | 'logs' | 'scripts' | 'uploader';
  setActiveTab: (tab: 'vault' | 'logs' | 'scripts' | 'uploader') => void;
  filesCount: number;
  logsCount: number;
  onDownloadAll: () => void;
  hasFiles: boolean;
  onLogout?: () => void;
  onGoToHome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  filesCount,
  logsCount,
  onDownloadAll,
  hasFiles,
  onLogout,
  onGoToHome,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={onGoToHome}
            className="flex items-center gap-3 text-left focus:outline-none"
            title="Go to Public DropVault"
          >
            <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
                DropVault
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">
                Admin Panel
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links (Single-line controls) */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('vault')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'vault'
                ? 'bg-slate-800 text-sky-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            <span>Files Vault</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-900 text-slate-300 rounded">
              {filesCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'logs'
                ? 'bg-slate-800 text-sky-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Audit Logs</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-900 text-slate-300 rounded">
              {logsCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('scripts')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'scripts'
                ? 'bg-slate-800 text-sky-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>PC Automation</span>
          </button>

          <button
            onClick={() => setActiveTab('uploader')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'uploader'
                ? 'bg-slate-800 text-sky-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Web Drop</span>
          </button>
        </nav>

        {/* Zone 3: 1 Primary CTA + Logout */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onDownloadAll}
            disabled={!hasFiles}
            title={hasFiles ? "Download all files as single ZIP" : "No files to download"}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:hover:bg-sky-600 rounded-md transition-colors whitespace-nowrap shrink-0 shadow-sm shadow-sky-950"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download All ZIP</span>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              title="Lock Admin Session"
              className="px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-md transition-colors whitespace-nowrap"
            >
              Lock
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
