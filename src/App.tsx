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
import { 
  subscribeToFiles, 
  subscribeToLogs, 
  deleteFileFromFirebase, 
  clearFirebaseLogs 
} from './lib/firebaseStore';
import { AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

const ADMIN_PASSCODE = 'cookie';
const DOMAIN_URL = 'https://cook-3.vercel.app';

export default function App() {
  // Helper to determine if current URL targets admin
  const checkIsAdmin = (): boolean => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    return (
      path === '/admin' || 
      path.startsWith('/admin/') || 
      hash === '#/admin' || 
      hash.startsWith('#/admin') || 
      search.includes('admin=true')
    );
  };

  // Navigation: check if user accessed /admin directly or via hash or search
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(checkIsAdmin);

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

  const currentHost = typeof window !== 'undefined' && window.location.origin.includes('localhost') || window.location.origin.includes('run.app')
    ? window.location.origin
    : DOMAIN_URL;

  // Listen to browser navigation (back/forward and hash changes)
  useEffect(() => {
    const handleUrlChange = () => {
      setIsAdminRoute(checkIsAdmin());
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // Path navigation helper (supports both pathname and hash for static hosts like Vercel)
  const navigateTo = (path: string) => {
    if (path.startsWith('/admin')) {
      window.history.pushState(null, '', '/admin');
      window.location.hash = '/admin';
      setIsAdminRoute(true);
    } else {
      window.history.pushState(null, '', '/');
      window.location.hash = '';
      setIsAdminRoute(false);
    }
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

  // Fetch all state from server & Firestore
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);

    try {
      const [filesRes, logsRes, statsRes] = await Promise.all([
        fetch('/api/files').catch(() => null),
        fetch('/api/logs').catch(() => null),
        fetch('/api/system-status').catch(() => null)
      ]);

      let serverFiles: UploadedFile[] = [];
      let serverLogs: UploadAuditLog[] = [];

      if (filesRes && filesRes.ok) {
        const filesData = await filesRes.json();
        serverFiles = filesData.files || [];
      }

      if (logsRes && logsRes.ok) {
        const logsData = await logsRes.json();
        serverLogs = logsData.logs || [];
      }

      if (statsRes && statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData?.stats) setStats(statsData.stats);
      }

      // Merge with state, deduplicating by ID
      setFiles(prev => {
        const combined = [...serverFiles];
        prev.forEach(p => {
          if (!combined.some(c => c.id === p.id)) {
            combined.push(p);
          }
        });
        return combined.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      });

      setLogs(prev => {
        const combined = [...serverLogs];
        prev.forEach(p => {
          if (!combined.some(c => c.id === p.id)) {
            combined.push(p);
          }
        });
        return combined.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
      });

      setLastRefreshed(new Date());
    } catch (err: any) {
      console.warn('API sync warning:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  // Real-time Firebase Firestore subscriptions
  useEffect(() => {
    // 1. Initial server fetch
    fetchData();

    // 2. Real-time Firestore sync
    const unsubscribeFiles = subscribeToFiles((firebaseFiles) => {
      setFiles(prev => {
        const map = new Map<string, UploadedFile>();
        // Add existing files
        prev.forEach(f => map.set(f.id, f));
        // Add or update Firestore files
        firebaseFiles.forEach(f => map.set(f.id, f));
        const merged = Array.from(map.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        if (prev.length > 0 && merged.length > prev.length) {
          setAutoSyncNotice(`Received ${merged.length - prev.length} new file(s) from PC ingestion!`);
          setTimeout(() => setAutoSyncNotice(null), 4000);
        }
        return merged;
      });
      setLoading(false);
    });

    const unsubscribeLogs = subscribeToLogs((firebaseLogs) => {
      setLogs(prev => {
        const map = new Map<string, UploadAuditLog>();
        prev.forEach(l => map.set(l.id, l));
        firebaseLogs.forEach(l => map.set(l.id, l));
        return Array.from(map.values()).sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
      });
    });

    // 3. Periodic fallback poll
    const interval = setInterval(() => {
      fetchData(true);
    }, 6000);

    return () => {
      unsubscribeFiles();
      unsubscribeLogs();
      clearInterval(interval);
    };
  }, [fetchData]);

  // Handle single file deletion
  const handleDeleteFile = async (id: string, name: string) => {
    const targetFile = files.find(f => f.id === id);
    try {
      // 1. Delete on server disk
      await fetch(`/api/files/${id}`, { method: 'DELETE' }).catch(() => {});
      // 2. Delete on Firebase
      if (targetFile) {
        await deleteFileFromFirebase(targetFile);
      }
      setFiles(prev => prev.filter(f => f.id !== id));
    } catch (err: any) {
      alert(`Error deleting file: ${err.message}`);
    }
  };

  // Handle clear logs
  const handleClearLogs = async () => {
    try {
      await fetch('/api/logs', { method: 'DELETE' }).catch(() => {});
      await clearFirebaseLogs();
      setLogs([]);
    } catch (err: any) {
      alert(`Error clearing logs: ${err.message}`);
    }
  };

  // Download all files as a ZIP archive
  const handleDownloadAll = () => {
    if (files.length === 0) return;
    // If Express backend is active:
    window.location.href = '/api/files/download-all';
  };

  // 1. PUBLIC VIEW (Root /)
  if (!isAdminRoute) {
    return (
      <PublicHome
        onNavigateToAdmin={() => navigateTo('/admin')}
        domainUrl={currentHost}
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
          currentHost={currentHost}
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
                serverUrl={currentHost}
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
            <span>Host: {currentHost}</span>
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
