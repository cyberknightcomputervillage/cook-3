import React, { useState, useMemo } from 'react';
import { UploadAuditLog } from '../types';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Terminal, 
  FileSpreadsheet,
  Globe
} from 'lucide-react';

interface AuditLogsProps {
  logs: UploadAuditLog[];
  onRefresh: () => void;
  onClearLogs: () => Promise<void>;
}

export const AuditLogs: React.FC<AuditLogsProps> = ({ logs, onRefresh, onClearLogs }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'FAILED'>('ALL');
  const [ipFilter, setIpFilter] = useState<string>('ALL');

  // Unique IPs
  const uniqueIps = useMemo(() => {
    return Array.from(new Set(logs.map(l => l.uploaderIp).filter(Boolean)));
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.uploaderIp.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.userAgent.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.fileNames.some(name => name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;
      const matchesIp = ipFilter === 'ALL' || log.uploaderIp === ipFilter;

      return matchesSearch && matchesStatus && matchesIp;
    });
  }, [logs, searchQuery, statusFilter, ipFilter]);

  const handleExportCsv = () => {
    if (logs.length === 0) return;
    const headers = ['Timestamp', 'IP Address', 'Status', 'Files Count', 'Total Size', 'File Names', 'Client Agent'];
    const rows = logs.map(l => [
      `"${l.timestamp}"`,
      `"${l.uploaderIp}"`,
      `"${l.status}"`,
      l.filesCount,
      `"${l.totalSizeFormatted}"`,
      `"${l.fileNames.join('; ')}"`,
      `"${l.userAgent.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DropVault_Upload_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJson = () => {
    if (logs.length === 0) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `DropVault_Upload_Audit_Logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClear = async () => {
    if (window.confirm('Are you sure you want to clear all upload audit logs? File data on disk will remain untouched.')) {
      await onClearLogs();
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
      {/* Top action & filter bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by IP, file name, or user agent..."
            className="w-full bg-slate-950 border border-slate-800 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-md px-2 py-1">
            <Filter className="w-3 h-3 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">All Statuses</option>
              <option value="SUCCESS" className="bg-slate-900 text-slate-200">Success (200)</option>
              <option value="FAILED" className="bg-slate-900 text-slate-200">Failed (400)</option>
            </select>
          </div>

          {/* IP filter */}
          {uniqueIps.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-md px-2 py-1">
              <Globe className="w-3 h-3 text-slate-400 shrink-0" />
              <select
                value={ipFilter}
                onChange={(e) => setIpFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900 text-slate-200">All Client IPs</option>
                {uniqueIps.map(ip => (
                  <option key={ip} value={ip} className="bg-slate-900 text-slate-200">
                    {ip}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            disabled={logs.length === 0}
            title="Export logs as CSV spreadsheet"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 bg-slate-950 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 rounded-md transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>CSV</span>
          </button>

          {/* Export JSON */}
          <button
            onClick={handleExportJson}
            disabled={logs.length === 0}
            title="Export raw JSON logs"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 bg-slate-950 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 rounded-md transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>JSON</span>
          </button>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            title="Refresh logs"
            className="p-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-md transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Clear */}
          <button
            onClick={handleClear}
            disabled={logs.length === 0}
            title="Clear all logs"
            className="p-1.5 bg-slate-950 border border-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 disabled:opacity-40 rounded-md transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        {filteredLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-medium">
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Client IP Address</th>
                  <th className="py-2.5 px-4">Client Agent</th>
                  <th className="py-2.5 px-4">Files Received</th>
                  <th className="py-2.5 px-4">Total Payload</th>
                  <th className="py-2.5 px-4 text-right">Accountability Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLogs.map((log) => {
                  const isSuccess = log.status === 'SUCCESS';
                  return (
                    <tr 
                      key={log.id} 
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Timestamp */}
                      <td className="py-2.5 px-4 whitespace-nowrap text-slate-300 font-mono tabular-nums">
                        {formatDate(log.timestamp)}
                      </td>

                      {/* Client IP */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="font-mono tabular-nums text-slate-200 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-medium text-[11px]">
                          {log.uploaderIp}
                        </span>
                      </td>

                      {/* Client Agent */}
                      <td className="py-2.5 px-4 max-w-xs truncate text-slate-400 font-mono text-[11px]" title={log.userAgent}>
                        <span className="text-slate-300 font-semibold">{log.clientType.toUpperCase()}</span>
                        <span className="text-slate-500 ml-1.5">{log.userAgent}</span>
                      </td>

                      {/* Files */}
                      <td className="py-2.5 px-4 max-w-xs">
                        {log.fileNames.length > 0 ? (
                          <div className="space-y-0.5">
                            <span className="text-slate-200 font-medium block truncate" title={log.fileNames.join(', ')}>
                              {log.fileNames[0]}
                            </span>
                            {log.fileNames.length > 1 && (
                              <span className="text-[10px] text-slate-500 font-mono block">
                                + {log.fileNames.length - 1} more file(s)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">None (Empty payload)</span>
                        )}
                      </td>

                      {/* Total Payload Size */}
                      <td className="py-2.5 px-4 whitespace-nowrap font-mono tabular-nums text-slate-300">
                        {log.totalSizeFormatted}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isSuccess ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400 font-mono font-medium">HTTP 200 OK</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-rose-400" />
                              <span className="text-rose-400 font-mono font-medium">HTTP 400 REJECT</span>
                            </>
                          )}
                        </div>
                        {log.errorMessage && (
                          <p className="text-[10px] text-rose-400/80 font-mono truncate mt-0.5 max-w-xs ml-auto" title={log.errorMessage}>
                            {log.errorMessage}
                          </p>
                        )}
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
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-200">
                {searchQuery || statusFilter !== 'ALL' || ipFilter !== 'ALL'
                  ? 'No matching audit records'
                  : 'No upload events logged yet'}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Every request made to the upload endpoint records the caller's IP address, timestamp, payload size, and user agent here for full accountability.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <strong className="font-mono text-slate-300">{filteredLogs.length}</strong> of{' '}
          <strong className="font-mono text-slate-300">{logs.length}</strong> audit log entries
        </span>
        <span className="font-mono text-slate-500">
          Accountability: Client IP, Payload Size, User-Agent &amp; Result
        </span>
      </div>
    </div>
  );
};
