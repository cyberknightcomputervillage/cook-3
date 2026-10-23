import { 
  collection, 
  getDocs, 
  addDoc, 
  setDoc, 
  doc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { firestore, storage } from './firebase';
import { UploadedFile, UploadAuditLog } from '../types';

export const FILES_COLLECTION = 'uploaded_files';
export const LOGS_COLLECTION = 'upload_logs';

// Subscribe to real-time files from Firestore
export function subscribeToFiles(callback: (files: UploadedFile[]) => void) {
  try {
    const q = query(collection(firestore, FILES_COLLECTION), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const items: UploadedFile[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as UploadedFile);
      });
      callback(items);
    }, (err) => {
      console.warn('[Firestore] Files subscription notice:', err.message);
    });
  } catch (err) {
    console.warn('[Firestore] Could not start subscription:', err);
    return () => {};
  }
}

// Subscribe to real-time audit logs from Firestore
export function subscribeToLogs(callback: (logs: UploadAuditLog[]) => void) {
  try {
    const q = query(collection(firestore, LOGS_COLLECTION), orderBy('timestampMs', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const items: UploadAuditLog[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as UploadAuditLog);
      });
      callback(items);
    }, (err) => {
      console.warn('[Firestore] Logs subscription notice:', err.message);
    });
  } catch (err) {
    console.warn('[Firestore] Could not start logs subscription:', err);
    return () => {};
  }
}

// Upload file directly to Firebase Storage & register in Firestore
export async function uploadDirectToFirebase(file: File, clientIp = 'Browser-Client'): Promise<UploadedFile> {
  const fileId = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storageRef = ref(storage, `uploads/${Date.now()}_${safeName}`);

  // 1. Upload binary to Firebase Storage
  const snapshot = await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(snapshot.ref);

  const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : '';
  const now = new Date();

  const fileRecord: UploadedFile = {
    id: fileId,
    originalName: file.name,
    serverFilename: safeName,
    size: file.size,
    sizeFormatted: formatBytes(file.size),
    mimeType: file.type || 'application/octet-stream',
    extension: ext,
    category: categorize(ext),
    uploadedAt: now.toISOString(),
    timestamp: now.getTime(),
    uploaderIp: clientIp,
    userAgent: navigator.userAgent,
    downloadUrl: downloadUrl,
    previewUrl: downloadUrl,
  };

  // 2. Record to Firestore
  try {
    await setDoc(doc(firestore, FILES_COLLECTION, fileId), fileRecord);

    const logRecord: UploadAuditLog = {
      id: crypto.randomUUID(),
      timestamp: now.toISOString(),
      timestampMs: now.getTime(),
      uploaderIp: clientIp,
      userAgent: navigator.userAgent,
      filesCount: 1,
      totalSizeBytes: file.size,
      totalSizeFormatted: formatBytes(file.size),
      fileNames: [file.name],
      status: 'SUCCESS',
      clientType: 'browser',
    };

    await setDoc(doc(firestore, LOGS_COLLECTION, logRecord.id), logRecord);
  } catch (err) {
    console.warn('[Firestore] Record failed:', err);
  }

  return fileRecord;
}

// Delete file from Firestore and Firebase Storage
export async function deleteFileFromFirebase(file: UploadedFile): Promise<void> {
  try {
    await deleteDoc(doc(firestore, FILES_COLLECTION, file.id));
  } catch (err) {
    console.warn('[Firestore] Delete doc error:', err);
  }

  try {
    if (file.downloadUrl && file.downloadUrl.includes('firebasestorage.app')) {
      const storageRef = ref(storage, `uploads/${file.serverFilename}`);
      await deleteObject(storageRef);
    }
  } catch (err) {
    // Ignore storage deletion errors if file was local
  }
}

// Clear logs in Firestore
export async function clearFirebaseLogs(): Promise<void> {
  try {
    const snap = await getDocs(collection(firestore, LOGS_COLLECTION));
    const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  } catch (err) {
    console.warn('[Firestore] Clear logs error:', err);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function categorize(ext: string): UploadedFile['category'] {
  const clean = ext.toLowerCase().replace('.', '');
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(clean)) return 'archive';
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'].includes(clean)) return 'document';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(clean)) return 'image';
  if (['py', 'js', 'ts', 'html', 'css', 'json', 'sh'].includes(clean)) return 'code';
  if (['exe', 'bin', 'dmg', 'iso'].includes(clean)) return 'binary';
  return 'other';
}
