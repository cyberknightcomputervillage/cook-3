import React, { useState, useRef } from 'react';
import { UploadCloud, Folder, File, CheckCircle2, AlertCircle, X, ArrowRight } from 'lucide-react';
import { uploadDirectToFirebase } from '../lib/firebaseStore';

interface DirectUploaderProps {
  onUploadSuccess: () => void;
  onNavigateToVault: () => void;
}

export const DirectUploader: React.FC<DirectUploaderProps> = ({ onUploadSuccess, onNavigateToVault }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      setSelectedFiles(prev => [...prev, ...files]);
      setStatusMessage(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);
      setStatusMessage(null);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearSelection = () => {
    setSelectedFiles([]);
    setStatusMessage(null);
    setUploadProgress(0);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalBytes = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(15);
    setStatusMessage(null);

    // Try standard server upload first
    let serverUploadSuccess = false;
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('files', file);
        if ((file as any).webkitRelativePath) {
          formData.append(`path_files`, (file as any).webkitRelativePath);
        }
      });

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        serverUploadSuccess = true;
        setStatusMessage({
          type: 'success',
          text: `Successfully uploaded ${selectedFiles.length} file(s) (${formatSize(totalBytes)}) to the server vault!`
        });
        setSelectedFiles([]);
        onUploadSuccess();
        setUploading(false);
        return;
      }
    } catch {
      // Continue to Firebase fallback
    }

    // Direct Firebase Storage fallback (works seamlessly on Vercel without server backend)
    try {
      setUploadProgress(40);
      let count = 0;
      for (const file of selectedFiles) {
        await uploadDirectToFirebase(file);
        count++;
        setUploadProgress(Math.round(40 + (count / selectedFiles.length) * 55));
      }

      setUploadProgress(100);
      setStatusMessage({
        type: 'success',
        text: `Successfully saved ${selectedFiles.length} file(s) (${formatSize(totalBytes)}) to Firebase Cloud Vault!`
      });
      setSelectedFiles([]);
      onUploadSuccess();
    } catch (fbErr: any) {
      setStatusMessage({
        type: 'error',
        text: `Upload failed: ${fbErr?.message || 'Transmission error'}`
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Drop area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragActive
            ? 'border-sky-400 bg-sky-950/20'
            : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900'
        }`}
      >
        <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center text-sky-400 mb-3">
          <UploadCloud className="w-6 h-6" />
        </div>

        <h3 className="text-sm font-semibold text-slate-200">
          Drop your files, ZIP archives, or folders here
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Files will be saved directly to the designated server directory and registered in your admin accountability logs.
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {/* Pick individual or multiple files */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors"
          >
            <File className="w-3.5 h-3.5" />
            <span>Select Files</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Pick directory / folder */}
          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors"
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Select Folder</span>
          </button>
          <input
            ref={folderInputRef}
            type="file"
            // @ts-ignore
            webkitdirectory="true"
            // @ts-ignore
            directory="true"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Selected files queue */}
      {selectedFiles.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              Selected Files ({selectedFiles.length}) · Total {formatSize(totalBytes)}
            </span>
            <button
              onClick={clearSelection}
              disabled={uploading}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40"
            >
              Clear all
            </button>
          </div>

          {/* File list preview */}
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-800/50">
            {selectedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs py-1.5">
                <div className="flex items-center gap-2 truncate pr-2">
                  <File className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-200 truncate">
                    {(file as any).webkitRelativePath || file.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono tabular-nums text-slate-400 text-[11px]">
                    {formatSize(file.size)}
                  </span>
                  {!uploading && (
                    <button
                      onClick={() => removeFile(idx)}
                      className="text-slate-500 hover:text-rose-400 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          {uploading && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs font-mono text-slate-400">
                <span>Uploading to server...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit button */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-medium rounded-md transition-colors shadow-sm"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{uploading ? `Uploading (${uploadProgress}%)...` : `Send ${selectedFiles.length} File(s) Now`}</span>
            </button>
          </div>
        </div>
      )}

      {/* Feedback Messages */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-lg border flex items-center justify-between gap-3 text-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>

          {statusMessage.type === 'success' && (
            <button
              onClick={onNavigateToVault}
              className="flex items-center gap-1 font-semibold text-emerald-300 hover:text-emerald-200 underline underline-offset-2 whitespace-nowrap"
            >
              <span>View in Vault</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
