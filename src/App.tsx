import React, { useState, useEffect, useCallback } from 'react';
import { UploadedFile, UploadAuditLog, SystemStats } from './types';
import { Header } from './components/Header';
import { StatsBar } from './components/StatsBar';
import { FilesVault } from './components/FilesVault';
import { AuditLogs } from './components/AuditLogs';
import { ScriptGuides } from './components/ScriptGuides';
import { DirectUploader } from './components/DirectUploader';
import { FilePreviewModal } from './components/FilePreviewModal';
import { PublicHome } from './components/PublicHome';
import { AdminLogin } from './components/AdminLogin';
import { AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

const ADMIN_PASSCODE = 'cookie';
const DOMAIN_URL = 'https://cook-3.vercel.app';

export default function App() {
  // Navigation: check if user accessed /admin directly or via url
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname.startsWith('/admin');
    }
    return false;
  });

  // Admin authentication state saved in session
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('dropvault_admin_auth') === ADMIN_PASSCODE;
    }
    return false;
  });

  const [activeTab, setActiveTab] = useState<'vault' | 'logs' | 'scripts' | 'uploader'>('vault');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [logs, setLogs] = useState<UploadAuditLog[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [previewingFile, setPreviewingFile] = useState<UploadedFile | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [autoSyncNotice, setAutoSyncNotice] = useState<string | null>(null);

  const currentHost = typeof window !== 'undefined' ? window.location.origin : DOMAIN_URL;

  // Listen to browser navigation back/forward
  useEffect(() => {
    const handlePopState = () => {
      setIsAdminRoute(window.location.pathname.startsWith('/admin'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Path navigation helper
  const navigateTo = (path: string) => {
    window.history.pushState(null, '', path);
    setIsAdminRoute(path.startsWith('/admin'));
  };

  // Login handler
  const handleLogin = (passcode: string): boolean => {
    if (passcode.trim() === ADMIN_PASSCODE) {
      sessionStorage.setItem('dropvault_admin_auth', ADMIN_PASSCODE);
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  // Logout handler
  const handleLogout = () => {
    sessionStorage.removeItem('dropvault_admin_auth');
    setIsAuthenticated(false);
  };

  // Fetch all state from server
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);

    try {
      const [filesRes, logsRes, statsRes] = await Promise.all([
        fetch('/api/files'),
        fetch('/api/logs'),
        fetch('/api/system-status')
      ]);

      if (!filesRes.ok || !logsRes.ok) {
        throw new Error('Failed to communicate with server');
      }

      const filesData = await filesRes.json();
      const logsData = await logsRes.json();
      const statsData = statsRes.ok ? await statsRes.json() : null;

      // Check if new files arrived
      setFiles(prev => {
        if (prev.length > 0 && filesData.files && filesData.files.length > prev.length) {
          const diff = filesData.files.length - prev.length;
          setAutoSyncNotice(`Received ${diff} new file(s) from PC ingestion!`);
          setTimeout(() => setAutoSyncNotice(null), 4000);
        }
        return filesData.files || [];
      });

      setLogs(logsData.logs || []);
      if (statsData?.stats) {
        setStats(statsData.stats);
      }
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error('Data fetch error:', err);
      setError(err.message || 'Server communication issue');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  // Poll for new files when in admin view
  useEffect(() => {
    fetchData();

    const interval = setInterval(() => {
      fetchData(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchData]);

  // Handle single file deletion
  const handleDeleteFile = async (id: string) => {
    try {
      const res = await fetch(`/api/files/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete file');
      await fetchData(true);
    } catch (err: any) {
      alert(`Error deleting file: ${err.message}`);
    }
  };

  // Handle clear logs
  const handleClearLogs = async () => {
    try {
      const res = await fetch('/api/logs', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to clear logs');
      await fetchData(true);
    } catch (err: any) {
      alert(`Error clearing logs: ${err.message}`);
    }
  };

  // Download all files as a ZIP archive
  const handleDownloadAll = () => {
    if (files.length === 0) return;
    window.location.href = '/api/files/download-all';
  };

  // 1. PUBLIC VIEW (Root /)
  if (!isAdminRoute) {
    return (
      <PublicHome
        onNavigateToAdmin={() => navigateTo('/admin')}
        domainUrl={DOMAIN_URL}
      />
    );
  }

  // 2. ADMIN LOGIN GATE (Protected with passcode 'cookie')
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center">
        <AdminLogin
          onLogin={handleLogin}
          onBackToHome={() => navigateTo('/')}
        />
      </div>
    );
  }

  // 3. ADMIN PANEL (Authenticated)
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500/30 selection:text-sky-200">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        filesCount={files.length}
        logsCount={logs.length}
        onDownloadAll={handleDownloadAll}
        hasFiles={files.length > 0}
        onLogout={handleLogout}
        onGoToHome={() => navigateTo('/')}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Real-time Notification Banner */}
        {autoSyncNotice && (
          <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs px-4 py-2.5 rounded-lg flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium">{autoSyncNotice}</span>
            </div>
            <button 
              onClick={() => setActiveTab('vault')}
              className="underline underline-offset-2 hover:text-white font-medium"
            >
              View Vault
            </button>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs px-4 py-3 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => fetchData()}
              className="text-xs bg-rose-500/20 hover:bg-rose-500/30 px-2.5 py-1 rounded transition-colors text-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* Metrics & Status Strip */}
        <StatsBar
          files={files}
          logs={logs}
          stats={stats}
          currentHost={DOMAIN_URL}
        />

        {/* Active View Switcher */}
        {loading && files.length === 0 ? (
          <div className="py-24 text-center space-y-3">
            <RefreshCw className="w-6 h-6 text-sky-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-mono">Loading DropVault data...</p>
          </div>
        ) : (
          <>
            {activeTab === 'vault' && (
              <FilesVault
                files={files}
                onRefresh={() => fetchData(true)}
                onDeleteFile={handleDeleteFile}
                onPreviewFile={(f) => setPreviewingFile(f)}
                onNavigateToScripts={() => setActiveTab('scripts')}
              />
            )}

            {activeTab === 'logs' && (
              <AuditLogs
                logs={logs}
                onRefresh={() => fetchData(true)}
                onClearLogs={handleClearLogs}
              />
            )}

            {activeTab === 'scripts' && (
              <ScriptGuides
                serverUrl={DOMAIN_URL}
                onTestUploadSuccess={() => {
                  fetchData(true);
                  setActiveTab('vault');
                }}
              />
            )}

            {activeTab === 'uploader' && (
              <DirectUploader
                onUploadSuccess={() => {
                  fetchData(true);
                }}
                onNavigateToVault={() => setActiveTab('vault')}
              />
            )}
          </>
        )}
      </main>

      {/* Footer Info */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span>DropVault Admin Vault</span>
            <span>·</span>
            <span>Domain: {DOMAIN_URL}</span>
            <span>·</span>
            <button
              onClick={() => navigateTo('/')}
              className="text-sky-400 hover:text-sky-300 underline"
            >
              Public Upload View
            </button>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>Last checked: {lastRefreshed.toLocaleTimeString()}</span>
            <span>·</span>
            <button
              onClick={() => fetchData(true)}
              className="text-slate-400 hover:text-sky-400 transition-colors"
            >
              Sync Now
            </button>
          </div>
        </div>
      </footer>

      {/* File Preview Modal */}
      <FilePreviewModal
        file={previewingFile}
        onClose={() => setPreviewingFile(null)}
      />
    </div>
  );
}
