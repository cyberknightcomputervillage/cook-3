export interface UploadedFile {
  id: string;
  originalName: string;
  serverFilename: string;
  relativePath?: string;
  size: number;
  sizeFormatted: string;
  mimeType: string;
  extension: string;
  category: 'archive' | 'document' | 'image' | 'code' | 'video' | 'audio' | 'binary' | 'other';
  uploadedAt: string; // ISO string
  timestamp: number;
  uploaderIp: string;
  userAgent?: string;
  downloadUrl: string;
  previewUrl?: string;
}

export interface UploadAuditLog {
  id: string;
  timestamp: string;
  timestampMs: number;
  uploaderIp: string;
  userAgent: string;
  filesCount: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  fileNames: string[];
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
  clientType: 'pc_script' | 'curl' | 'browser' | 'powershell' | 'python' | 'other';
}

export interface SystemStats {
  totalFiles: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  totalUploadEvents: number;
  uniqueIpsCount: number;
  designatedDir: string;
  uptimeSeconds: number;
  serverTime: string;
  appUrl: string;
  firebaseConnected: boolean;
}
