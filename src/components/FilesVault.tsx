import React, { useState, useMemo } from 'react';
import { UploadedFile } from '../types';
import { 
  FileArchive, 
  FileText, 
  FileCode, 
  FileImage, 
  FileVideo, 
  FileAudio, 
  File as FileGeneric, 
  Search, 
  Download, 
  Eye, 
  Trash2, 
  Copy, 
  Check, 
  ArrowUpDown,
  Filter,
  RefreshCw,
  Terminal,
  FolderOpen
} from 'lucide-react';

interface FilesVaultProps {
  files: UploadedFile[];
  onRefresh: () => void;
  onDeleteFile: (id: string, name: string) => Promise<void>;
  onPreviewFile: (file: UploadedFile) => void;
  onNavigateToScripts: () => void;
}

export const FilesVault: React.FC<FilesVaultProps> = ({
  files,
  onRefresh,
  onDeleteFile,
  onPreviewFile,
  onNavigateToScripts,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedIp, setSelectedIp] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'size-desc' | 'size-asc'>('date-desc');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Collect unique IPs for filtering
  const uniqueIps = useMemo(() => {
    return Array.from(new Set(files.map(f => f.uploaderIp).filter(Boolean)));
  }, [files]);

  // Categories list
  const categories = [
    { id: 'all', label: 'All Formats' },
    { id: 'archive', label: 'Archives (ZIP, RAR, 7z)' },
    { id: 'document', label: 'Documents' },
    { id: 'image', label: 'Images' },
    { id: 'code', label: 'Code & Scripts' },
    { id: 'other', label: 'Binaries & Other' },
  ];

  // Filtering and sorting
  const filteredFiles = useMemo(() => {
    return files
      .filter(f => {
        const matchesQuery = 
          f.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (f.relativePath && f.relativePath.toLowerCase().includes(searchQuery.toLowerCase())) ||
          f.extension.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesCategory = 
          selectedCategory === 'all' || 
          f.category === selectedCategory ||
          (selectedCategory === 'other' && ['binary', 'video', 'audio', 'other'].includes(f.category));

        const matchesIp = selectedIp === 'all' || f.uploaderIp === selectedIp;

        return matchesQuery && matchesCategory && matchesIp;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') return b.timestamp - a.timestamp;
        if (sortBy === 'date-asc') return a.timestamp - b.timestamp;
        if (sortBy === 'size-desc') return b.size - a.size;
        if (sortBy === 'size-asc') return a.size - b.size;
        return 0;
      });
  }, [files, searchQuery, selectedCategory, selectedIp, sortBy]);

  const handleCopyLink = (file: UploadedFile) => {
    const fullUrl = `${window.location.origin}${file.downloadUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(file.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete "${name}" from the server vault?`)) {
      setDeletingId(id);
      try {
        await onDeleteFile(id, name);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const getFileIcon = (category: UploadedFile['category']) => {
    switch (category) {
      case 'archive':
        return <FileArchive className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'document':
        return <FileText className="w-4 h-4 text-blue-400 shrink-0" />;
      case 'code':
        return <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'image':
        return <FileImage className="w-4 h-4 text-purple-400 shrink-0" />;
      case 'video':
        return <FileVideo className="w-4 h-4 text-pink-400 shrink-0" />;
      case 'audio':
        return <FileAudio className="w-4 h-4 text-cyan-400 shrink-0" />;
      default:
        return <FileGeneric className="w-4 h-4 text-slate-400 shrink-0" />;
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-4">
      {/* Control bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by file name, folder or extension..."
            className="w-full bg-slate-950 border border-slate-800 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
            >
              ×
            </button>
          )}
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* IP Filter */}
          {uniqueIps.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-md px-2 py-1">
              <Filter className="w-3 h-3 text-slate-400 shrink-0" />
              <select
                value={selectedIp}
                onChange={(e) => setSelectedIp(e.target.value)}
                className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-slate-200">All Client IPs</option>
                {uniqueIps.map(ip => (
                  <option key={ip} value={ip} className="bg-slate-900 text-slate-200">
                    IP: {ip}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sort Control */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-md px-2 py-1">
            <ArrowUpDown className="w-3 h-3 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="date-desc" className="bg-slate-900 text-slate-200">Newest first</option>
              <option value="date-asc" className="bg-slate-900 text-slate-200">Oldest first</option>
              <option value="size-desc" className="bg-slate-900 text-slate-200">Largest size</option>
              <option value="size-asc" className="bg-slate-900 text-slate-200">Smallest size</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            title="Reload files from server"
            className="p-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-md transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Segmented Format Switcher */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
        {categories.map(cat => {
          const count = cat.id === 'all' 
            ? files.length 
            : cat.id === 'other'
              ? files.filter(f => ['binary', 'video', 'audio', 'other'].includes(f.category)).length
              : files.filter(f => f.category === cat.id).length;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900/50 hover:bg-slate-900 border border-slate-800/80'
              }`}
            >
              <span>{cat.label}</span>
              <span className="text-[10px] font-mono opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Files Table / List */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        {filteredFiles.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-medium">
                  <th className="py-2.5 px-4">File Name & Format</th>
                  <th className="py-2.5 px-4">Size</th>
                  <th className="py-2.5 px-4">Uploaded Timestamp</th>
                  <th className="py-2.5 px-4">Client IP</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredFiles.map((file) => {
                  return (
                    <tr 
                      key={file.id} 
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Name & format */}
                      <td className="py-2.5 px-4 max-w-xs sm:max-w-md">
                        <div className="flex items-center gap-2.5">
                          {getFileIcon(file.category)}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span 
                                className="font-medium text-slate-200 truncate block group-hover:text-sky-300 transition-colors"
                                title={file.originalName}
                              >
                                {file.originalName}
                              </span>
                            </div>
                            {file.relativePath && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono truncate">
                                <FolderOpen className="w-3 h-3 shrink-0" />
                                <span>{file.relativePath}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Size */}
                      <td className="py-2.5 px-4 whitespace-nowrap font-mono tabular-nums text-slate-300">
                        {file.sizeFormatted}
                      </td>

                      {/* Uploaded Timestamp */}
                      <td className="py-2.5 px-4 whitespace-nowrap text-slate-400 font-mono tabular-nums">
                        {formatDate(file.uploadedAt)}
                      </td>

                      {/* Client IP */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="font-mono tabular-nums text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                          {file.uploaderIp}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Direct Download */}
                          <a
                            href={file.downloadUrl}
                            download={file.originalName}
                            title="Download file directly"
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          {/* Quick Preview */}
                          <button
                            onClick={() => onPreviewFile(file)}
                            title="Preview file content"
                            className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Copy Link */}
                          <button
                            onClick={() => handleCopyLink(file)}
                            title="Copy download URL"
                            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                          >
                            {copiedId === file.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Delete File */}
                          <button
                            onClick={() => handleDelete(file.id, file.originalName)}
                            disabled={deletingId === file.id}
                            title="Delete file permanently"
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors disabled:opacity-40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 px-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center text-slate-400">
              <FileArchive className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-200">
                {searchQuery || selectedCategory !== 'all' || selectedIp !== 'all'
                  ? 'No matching files found'
                  : 'Vault is currently empty'}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {searchQuery || selectedCategory !== 'all' || selectedIp !== 'all'
                  ? 'Try clearing your search query or adjusting your format / IP filters.'
                  : 'Files uploaded automatically from your PC code will appear here for one-click downloading and tracking.'}
              </p>
            </div>
            
            {!searchQuery && selectedCategory === 'all' && (
              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  onClick={onNavigateToScripts}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-sky-400 bg-sky-950/60 border border-sky-800/60 hover:bg-sky-900/40 rounded-md transition-colors"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>View PC Upload Code &amp; cURL</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {filteredFiles.length > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>
            Showing <strong className="font-mono text-slate-200">{filteredFiles.length}</strong> of{' '}
            <strong className="font-mono text-slate-200">{files.length}</strong> stored files
          </span>
          <span className="font-mono text-slate-500">
            Designated storage: /uploads
          </span>
        </div>
      )}
    </div>
  );
};
