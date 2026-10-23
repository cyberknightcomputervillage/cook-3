import React, { useState, useRef } from 'react';
import { UploadCloud, File, CheckCircle2, AlertCircle, Terminal, Lock, Copy, Check, ArrowRight, ShieldCheck } from 'lucide-react';
import { uploadDirectToFirebase } from '../lib/firebaseStore';

interface PublicHomeProps {
  onNavigateToAdmin: () => void;
  domainUrl: string;
}

export const PublicHome: React.FC<PublicHomeProps> = ({ onNavigateToAdmin, domainUrl }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const apiEndpoint = `${domainUrl}/api/upload`;
  const curlExample = `curl -X POST -F "file=@backup.zip" ${apiEndpoint}`;

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setUploadSuccess(null);
      setErrorMessage(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadSuccess(null);
      setErrorMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setProgress(20);
    setErrorMessage(null);

    // Try server API upload first
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        setUploadSuccess(json.message || 'File uploaded successfully!');
        setSelectedFile(null);
        setUploading(false);
        return;
      }
    } catch {
      // Continue to Firebase direct fallback
    }

    // Direct Firebase storage & Firestore fallback (works seamlessly on Vercel)
    try {
      setProgress(65);
      await uploadDirectToFirebase(selectedFile);
      setProgress(100);
      setUploadSuccess(`Successfully uploaded "${selectedFile.name}" to Firebase Cloud Vault!`);
      setSelectedFile(null);
    } catch (fbErr: any) {
      setErrorMessage(`Upload failed: ${fbErr?.message || 'Transmission error'}`);
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <UploadCloud className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm tracking-tight text-white">
              DropVault
            </span>
          </div>

          <button
            onClick={onNavigateToAdmin}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Admin Portal</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-12 flex flex-col justify-center space-y-8">
        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Simple File Ingestion Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Upload files, ZIPs, or folders directly from your PC. Accessible exclusively on your protected admin dashboard.
          </p>
        </div>

        {/* Upload Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-5 shadow-xl">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive
                ? 'border-sky-400 bg-sky-950/20'
                : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center text-sky-400 mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>

            <p className="text-sm font-semibold text-slate-200">
              {selectedFile ? selectedFile.name : 'Drag & drop any file here'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {selectedFile
                ? `${formatSize(selectedFile.size)} · Ready to send`
                : 'Supports ZIP archives, documents, code, folders, or any format up to 1 GB'}
            </p>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors"
              >
                Browse PC File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Progress bar */}
          {uploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono text-slate-400">
                <span>Sending file to server...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action button */}
          {selectedFile && !uploading && (
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelectedFile(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-md transition-colors"
              >
                Upload File
              </button>
            </div>
          )}

          {/* Success / Error Messages */}
          {uploadSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between text-xs text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
              <button
                onClick={onNavigateToAdmin}
                className="font-medium underline hover:text-white"
              >
                Go to Admin
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* API Integration Snippet (For their PC code) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold text-slate-200">
                Automated PC Ingestion API
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              No Auth Required
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Send files directly from your automated PC script using multipart/form-data:
          </p>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs flex items-center justify-between text-slate-300 overflow-x-auto">
            <span className="truncate pr-3 select-all">
              {curlExample}
            </span>
            <button
              onClick={() => copyText(curlExample, 'curl')}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors shrink-0"
              title="Copy cURL command"
            >
              {copiedKey === 'curl' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
            <span>Endpoint: <code className="text-slate-400 font-mono">{apiEndpoint}</code></span>
            <button
              onClick={onNavigateToAdmin}
              className="text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium"
            >
              <span>Admin Panel (/admin)</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-600">
        <p>DropVault Ingestion Service · Admin access restricted to <code className="text-slate-400 font-mono">/admin</code></p>
      </footer>
    </div>
  );
};
