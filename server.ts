import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import crypto from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const archiver = require('archiver');
import dotenv from 'dotenv';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { UploadedFile, UploadAuditLog, SystemStats } from './src/types/index.ts';

dotenv.config();

const app = express();
const PORT = 3000;
const startTime = Date.now();

// Designated server upload directory
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Local persistence store paths
const FILES_DB_PATH = path.join(UPLOAD_DIR, 'files_registry.json');
const LOGS_DB_PATH = path.join(UPLOAD_DIR, 'upload_logs.json');

// Initialize Firebase SDK for server-side mirroring
const firebaseConfig = {
  apiKey: "AIzaSyBAQOOLN43rjwat8lp43FBsfS53SD2yUio",
  authDomain: "cook-3-84c17.firebaseapp.com",
  projectId: "cook-3-84c17",
  storageBucket: "cook-3-84c17.firebasestorage.app",
  messagingSenderId: "487965315757",
  appId: "1:487965315757:web:63d990ba3ff8c4dab96c24",
  measurementId: "G-PLNKP11H2L"
};

let firestoreInstance: any = null;
try {
  const fbApp = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  firestoreInstance = getFirestore(fbApp);
  console.log('[DropVault] Firebase Firestore initialized successfully');
} catch (err) {
  console.warn('[DropVault] Firebase init notice:', err);
}

// Memory cache loaded from disk
function loadJsonSafe<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data) as T;
    }
  } catch (err) {
    console.error(`Failed to load ${filePath}:`, err);
  }
  return defaultValue;
}

function saveJsonSafe(filePath: string, data: any) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Failed to write ${filePath}:`, err);
  }
}

let filesRegistry: UploadedFile[] = loadJsonSafe<UploadedFile[]>(FILES_DB_PATH, []);
let uploadLogs: UploadAuditLog[] = loadJsonSafe<UploadAuditLog[]>(LOGS_DB_PATH, []);

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper: Format human-readable file sizes
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Helper: Detect file category from extension
function categorizeFile(ext: string): UploadedFile['category'] {
  const cleanExt = ext.toLowerCase().replace('.', '');
  const archives = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'tgz', 'iso'];
  const documents = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'tsv', 'txt', 'rtf', 'odt'];
  const images = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'heic'];
  const code = ['py', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'sh', 'bash', 'bat', 'ps1', 'c', 'cpp', 'rs', 'go', 'java', 'sql', 'php', 'rb', 'yaml', 'yml', 'md'];
  const video = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv'];
  const audio = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma'];
  const binary = ['exe', 'dll', 'bin', 'dmg', 'apk', 'deb', 'rpm', 'msi'];

  if (archives.includes(cleanExt)) return 'archive';
  if (documents.includes(cleanExt)) return 'document';
  if (images.includes(cleanExt)) return 'image';
  if (code.includes(cleanExt)) return 'code';
  if (video.includes(cleanExt)) return 'video';
  if (audio.includes(cleanExt)) return 'audio';
  if (binary.includes(cleanExt)) return 'binary';
  return 'other';
}

// Helper: Extract real Client IP address with fallback
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const list = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const ip = list.split(',')[0].trim();
    if (ip) return ip.replace('::ffff:', '');
  }
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    const ip = Array.isArray(realIp) ? realIp[0] : realIp;
    return ip.replace('::ffff:', '');
  }
  const socketIp = req.socket.remoteAddress || '127.0.0.1';
  return socketIp.replace('::ffff:', '') === '::1' ? '127.0.0.1' : socketIp.replace('::ffff:', '');
}

// Helper: Detect client type from user-agent
function detectClientType(ua: string): UploadAuditLog['clientType'] {
  const lower = ua.toLowerCase();
  if (lower.includes('python')) return 'python';
  if (lower.includes('curl')) return 'curl';
  if (lower.includes('powershell')) return 'powershell';
  if (lower.includes('mozilla') || lower.includes('chrome') || lower.includes('safari') || lower.includes('firefox')) return 'browser';
  if (lower.includes('node') || lower.includes('axios') || lower.includes('pc') || lower.includes('script') || lower.includes('go-http')) return 'pc_script';
  return 'other';
}

// Multer Storage Configuration
// Saves directly to designated UPLOAD_DIR
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const safeOriginal = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(4).toString('hex');
    const ext = path.extname(safeOriginal);
    const base = path.basename(safeOriginal, ext);
    cb(null, `${base}_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    // Generous limit for large zips, folders, files (1 GB)
    fileSize: 1024 * 1024 * 1024
  }
});

// Asynchronously mirror records to Firestore if available
async function mirrorToFirestore(collectionName: string, docId: string, data: any) {
  if (!firestoreInstance) return;
  try {
    const docRef = doc(firestoreInstance, collectionName, docId);
    await setDoc(docRef, data, { merge: true });
  } catch (err) {
    // If Firestore rules prohibit or error, local disk storage remains pristine
    console.debug(`[Firestore Mirror] Skipping sync to ${collectionName}:`, (err as any)?.message || err);
  }
}

async function deleteFromFirestore(collectionName: string, docId: string) {
  if (!firestoreInstance) return;
  try {
    const docRef = doc(firestoreInstance, collectionName, docId);
    await deleteDoc(docRef);
  } catch (err) {
    console.debug(`[Firestore Mirror] Skipping delete from ${collectionName}:`, (err as any)?.message || err);
  }
}

// -------------------------------------------------------------
// API ENDPOINTS
// -------------------------------------------------------------

// Quick health check endpoint for scripts
app.get('/api/health', (req: Request, res: Response) => {
  const clientIp = getClientIp(req);
  res.json({
    status: 'ONLINE',
    service: 'DropVault Ingestion Server',
    yourIp: clientIp,
    timestamp: new Date().toISOString(),
    designatedUploadDirectory: UPLOAD_DIR
  });
});

// System Status endpoint
app.get('/api/system-status', (req: Request, res: Response) => {
  const clientIp = getClientIp(req);
  const totalSizeBytes = filesRegistry.reduce((acc, f) => acc + (f.size || 0), 0);
  const uniqueIps = new Set(uploadLogs.map(l => l.uploaderIp));

  const stats: SystemStats = {
    totalFiles: filesRegistry.length,
    totalSizeBytes,
    totalSizeFormatted: formatBytes(totalSizeBytes),
    totalUploadEvents: uploadLogs.length,
    uniqueIpsCount: uniqueIps.size,
    designatedDir: UPLOAD_DIR,
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    serverTime: new Date().toISOString(),
    appUrl: process.env.APP_URL || `${req.protocol}://${req.get('host')}`,
    firebaseConnected: !!firestoreInstance
  };

  res.json({ success: true, stats, yourIp: clientIp });
});

// 1. SIMPLE UNRESTRICTED MULTIPART/FORM-DATA UPLOAD ENDPOINT
// Accepts single or multiple files under ANY field name ('file', 'files', 'upload', etc.)
// No authentication required so PC automation scripts can send effortlessly
app.post('/api/upload', upload.any(), async (req: Request, res: Response) => {
  const clientIp = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Automated-PC-Client';
  const clientType = detectClientType(userAgent);
  const now = new Date();
  const timestampIso = now.toISOString();
  const timestampMs = now.getTime();

  const rawFiles = (req.files as Express.Multer.File[]) || [];

  if (rawFiles.length === 0) {
    // Record failed attempt in audit log
    const failedLog: UploadAuditLog = {
      id: crypto.randomUUID(),
      timestamp: timestampIso,
      timestampMs,
      uploaderIp: clientIp,
      userAgent,
      filesCount: 0,
      totalSizeBytes: 0,
      totalSizeFormatted: '0 Bytes',
      fileNames: [],
      status: 'FAILED',
      errorMessage: 'No file was provided in multipart/form-data payload. Field name should be "file" or "files".',
      clientType
    };
    uploadLogs.unshift(failedLog);
    saveJsonSafe(LOGS_DB_PATH, uploadLogs);
    mirrorToFirestore('upload_logs', failedLog.id, failedLog);

    return res.status(400).json({
      success: false,
      error: 'No file received',
      message: 'Please send file(s) in multipart/form-data with field name "file" or "files"',
      hint: 'cURL example: curl -F "file=@yourfile.zip" ' + (process.env.APP_URL || 'https://YOUR_DOMAIN') + '/api/upload'
    });
  }

  const uploadedRecords: UploadedFile[] = [];
  let totalBatchBytes = 0;
  const fileNamesList: string[] = [];

  for (const f of rawFiles) {
    const fileId = crypto.randomUUID();
    const ext = path.extname(f.originalname) || '';
    const size = f.size;
    totalBatchBytes += size;
    fileNamesList.push(f.originalname);

    // Optional relative path from client folder upload
    const relativePath = req.body[`path_${f.fieldname}`] || req.body.path || req.body.relativePath || undefined;

    const record: UploadedFile = {
      id: fileId,
      originalName: f.originalname,
      serverFilename: f.filename,
      relativePath,
      size,
      sizeFormatted: formatBytes(size),
      mimeType: f.mimetype || 'application/octet-stream',
      extension: ext,
      category: categorizeFile(ext),
      uploadedAt: timestampIso,
      timestamp: timestampMs,
      uploaderIp: clientIp,
      userAgent,
      downloadUrl: `/api/files/${fileId}/download`,
      previewUrl: `/api/files/${fileId}/preview`
    };

    uploadedRecords.push(record);
    filesRegistry.unshift(record);

    // Mirror each uploaded file metadata to Firestore asynchronously
    mirrorToFirestore('uploaded_files', fileId, record);
  }

  // Create audit log for accountability
  const auditLog: UploadAuditLog = {
    id: crypto.randomUUID(),
    timestamp: timestampIso,
    timestampMs,
    uploaderIp: clientIp,
    userAgent,
    filesCount: rawFiles.length,
    totalSizeBytes: totalBatchBytes,
    totalSizeFormatted: formatBytes(totalBatchBytes),
    fileNames: fileNamesList,
    status: 'SUCCESS',
    clientType
  };

  uploadLogs.unshift(auditLog);

  // Persist locally
  saveJsonSafe(FILES_DB_PATH, filesRegistry);
  saveJsonSafe(LOGS_DB_PATH, uploadLogs);
  mirrorToFirestore('upload_logs', auditLog.id, auditLog);

  console.log(`[DropVault Upload] ${rawFiles.length} file(s) received from IP ${clientIp} (${formatBytes(totalBatchBytes)})`);

  return res.status(200).json({
    success: true,
    message: `Successfully uploaded ${rawFiles.length} file(s) to server vault`,
    uploaderIp: clientIp,
    timestamp: timestampIso,
    totalSize: formatBytes(totalBatchBytes),
    files: uploadedRecords.map(r => ({
      id: r.id,
      name: r.originalName,
      size: r.size,
      sizeFormatted: r.sizeFormatted,
      downloadUrl: r.downloadUrl,
      category: r.category
    }))
  });
});

// 2. GET ALL UPLOADED FILES (Admin Panel Listing)
app.get('/api/files', (req: Request, res: Response) => {
  // Sync verification: ensure files still exist on disk
  const verifiedList = filesRegistry.filter(f => {
    const diskPath = path.join(UPLOAD_DIR, f.serverFilename);
    return fs.existsSync(diskPath);
  });

  if (verifiedList.length !== filesRegistry.length) {
    filesRegistry = verifiedList;
    saveJsonSafe(FILES_DB_PATH, filesRegistry);
  }

  res.json({
    success: true,
    count: filesRegistry.length,
    files: filesRegistry
  });
});

// 3. DOWNLOAD A SPECIFIC FILE (Direct download)
app.get('/api/files/:id/download', (req: Request, res: Response) => {
  const { id } = req.params;
  const fileMeta = filesRegistry.find(f => f.id === id);

  if (!fileMeta) {
    return res.status(404).json({ success: false, error: 'File metadata not found' });
  }

  const diskPath = path.join(UPLOAD_DIR, fileMeta.serverFilename);
  if (!fs.existsSync(diskPath)) {
    return res.status(404).json({ success: false, error: 'File is no longer on server disk' });
  }

  // Set explicit download headers
  res.download(diskPath, fileMeta.originalName, (err) => {
    if (err && !res.headersSent) {
      console.error(`Download error for ${fileMeta.originalName}:`, err);
      res.status(500).json({ success: false, error: 'Failed to stream download' });
    }
  });
});

// 4. PREVIEW A SPECIFIC FILE (Inline stream for images, text, pdf)
app.get('/api/files/:id/preview', (req: Request, res: Response) => {
  const { id } = req.params;
  const fileMeta = filesRegistry.find(f => f.id === id);

  if (!fileMeta) {
    return res.status(404).send('File not found');
  }

  const diskPath = path.join(UPLOAD_DIR, fileMeta.serverFilename);
  if (!fs.existsSync(diskPath)) {
    return res.status(404).send('File not found on server disk');
  }

  res.setHeader('Content-Type', fileMeta.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${fileMeta.originalName}"`);
  const readStream = fs.createReadStream(diskPath);
  readStream.pipe(res);
});

// 5. DOWNLOAD ALL FILES AS SINGLE ZIP
app.get('/api/files/download-all', (req: Request, res: Response) => {
  if (filesRegistry.length === 0) {
    return res.status(400).json({ success: false, error: 'No files to archive' });
  }

  const archive = archiver('zip', { zlib: { level: 6 } });
  const archiveName = `DropVault_All_Files_${new Date().toISOString().slice(0, 10)}.zip`;

  res.attachment(archiveName);
  archive.pipe(res);

  for (const f of filesRegistry) {
    const diskPath = path.join(UPLOAD_DIR, f.serverFilename);
    if (fs.existsSync(diskPath)) {
      archive.file(diskPath, { name: f.originalName });
    }
  }

  archive.finalize().catch((err: any) => {
    console.error('Archive error:', err);
    if (!res.headersSent) res.status(500).send('Archiving failed');
  });
});

// 6. DELETE A SPECIFIC FILE
app.delete('/api/files/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const fileIndex = filesRegistry.findIndex(f => f.id === id);

  if (fileIndex === -1) {
    return res.status(404).json({ success: false, error: 'File not found' });
  }

  const fileMeta = filesRegistry[fileIndex];
  const diskPath = path.join(UPLOAD_DIR, fileMeta.serverFilename);

  try {
    if (fs.existsSync(diskPath)) {
      fs.unlinkSync(diskPath);
    }
  } catch (err) {
    console.error(`Failed to delete ${diskPath} from disk:`, err);
  }

  filesRegistry.splice(fileIndex, 1);
  saveJsonSafe(FILES_DB_PATH, filesRegistry);
  deleteFromFirestore('uploaded_files', id);

  res.json({
    success: true,
    message: `File ${fileMeta.originalName} deleted successfully`
  });
});

// 7. GET AUDIT LOGS (Accountability logs: IP, timestamp, size, agent)
app.get('/api/logs', (req: Request, res: Response) => {
  res.json({
    success: true,
    count: uploadLogs.length,
    logs: uploadLogs
  });
});

// 8. CLEAR AUDIT LOGS
app.delete('/api/logs', (req: Request, res: Response) => {
  uploadLogs = [];
  saveJsonSafe(LOGS_DB_PATH, uploadLogs);
  res.json({ success: true, message: 'All upload audit logs cleared' });
});

// -------------------------------------------------------------
// VITE DEV SERVER OR PRODUCTION SERVE
// -------------------------------------------------------------
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[DropVault] Running Vite in middleware dev mode');
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DropVault] Ingestion server listening on port ${PORT}`);
    console.log(`[DropVault] Storage destination: ${UPLOAD_DIR}`);
    console.log(`[DropVault] Ingestion endpoint ready: POST /api/upload`);
  });
}

startServer().catch(err => {
  console.error('[DropVault] Server boot failure:', err);
  process.exit(1);
});
