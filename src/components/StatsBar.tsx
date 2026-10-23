import React from 'react';
import { UploadedFile, UploadAuditLog, SystemStats } from '../types';
import { Files, HardDrive, Activity, Globe, Server } from 'lucide-react';

interface StatsBarProps {
  files: UploadedFile[];
  logs: UploadAuditLog[];
  stats: SystemStats | null;
  currentHost: string;
}

export const StatsBar: React.FC<StatsBarProps> = ({ files, logs, stats, currentHost }) => {
  const totalSizeBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
  
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uniqueIps = Array.from(new Set(logs.map(l => l.uploaderIp).filter(Boolean)));
  const latestLog = logs[0];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {/* Metric 1 */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Vault Files</span>
          <Files className="w-4 h-4 text-slate-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-bold font-mono tabular-nums text-white">
            {files.length}
          </span>
          <span className="text-xs text-slate-500">stored</span>
        </div>
      </div>

      {/* Metric 2 */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Storage Consumed</span>
          <HardDrive className="w-4 h-4 text-slate-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-bold font-mono tabular-nums text-sky-400">
            {formatSize(totalSizeBytes)}
          </span>
          <span className="text-xs text-slate-500">on disk</span>
        </div>
      </div>

      {/* Metric 3 */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Total Ingestions</span>
          <Activity className="w-4 h-4 text-slate-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-bold font-mono tabular-nums text-white">
            {logs.length}
          </span>
          <span className="text-xs text-slate-500">events logged</span>
        </div>
      </div>

      {/* Metric 4 */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Unique Client IPs</span>
          <Globe className="w-4 h-4 text-slate-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-bold font-mono tabular-nums text-emerald-400">
            {uniqueIps.length}
          </span>
          <span className="text-xs text-slate-500 truncate" title={latestLog ? `Latest: ${latestLog.uploaderIp}` : 'None'}>
            {latestLog ? `Latest: ${latestLog.uploaderIp}` : 'No uploads yet'}
          </span>
        </div>
      </div>

      {/* Metric 5 */}
      <div className="col-span-2 lg:col-span-1 bg-slate-900 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">API Endpoint</span>
          <Server className="w-4 h-4 text-slate-500" />
        </div>
        <div className="mt-2">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>POST /api/upload</span>
          </div>
          <p className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
            {currentHost ? `${currentHost}/api/upload` : 'Accepting multipart'}
          </p>
        </div>
      </div>
    </div>
  );
};
