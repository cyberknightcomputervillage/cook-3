import React, { useState, useEffect } from 'react';
import { UploadedFile } from '../types';
import { X, Download, Copy, Check, FileText, Image as ImageIcon, Archive, ExternalLink } from 'lucide-react';

interface FilePreviewModalProps {
  file: UploadedFile | null;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);

  useEffect(() => {
    if (!file) return;

    // If text/code/json, load content preview
    const isTextual = 
      file.category === 'code' || 
      file.category === 'document' && ['txt', 'csv', 'tsv', 'json', 'md', 'html', 'css', 'py', 'sh', 'yaml', 'yml'].some(ext => file.originalName.endsWith('.' + ext));

    if (isTextual && file.size < 2 * 1024 * 1024) { // Only fetch text if under 2MB
      setLoadingText(true);
      fetch(file.previewUrl || file.downloadUrl)
        .then(res => res.text())
        .then(text => {
          setTextContent(text);
          setLoadingText(false);
        })
        .catch(() => {
          setTextContent('Unable to load inline preview.');
          setLoadingText(false);
        });
    } else {
      setTextContent(null);
    }
  }, [file]);

  if (!file) return null;

  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}${file.downloadUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isImage = file.category === 'image';
  const isArchive = file.category === 'archive';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-950/60">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-slate-100 truncate" title={file.originalName}>
              {file.originalName}
            </h3>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
              <span>{file.sizeFormatted}</span>
              <span>·</span>
              <span>IP: {file.uploaderIp}</span>
              <span>·</span>
              <span>{new Date(file.uploadedAt).toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyLink}
              title="Copy direct download URL"
              className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <a
              href={file.downloadUrl}
              download={file.originalName}
              title="Download file"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto min-h-[250px] flex items-center justify-center bg-slate-950/40">
          {isImage ? (
            <div className="max-w-full max-h-[60vh] flex items-center justify-center">
              <img
                src={file.previewUrl || file.downloadUrl}
                alt={file.originalName}
                referrerPolicy="no-referrer"
                className="max-h-[55vh] max-w-full object-contain rounded border border-slate-800 bg-slate-900"
              />
            </div>
          ) : textContent !== null ? (
            <div className="w-full h-full">
              {loadingText ? (
                <div className="text-xs text-slate-400 font-mono text-center py-12">
                  Loading text preview...
                </div>
              ) : (
                <pre className="text-xs font-mono text-slate-300 bg-slate-950 p-4 rounded-lg border border-slate-800 overflow-x-auto whitespace-pre-wrap max-h-[55vh]">
                  {textContent}
                </pre>
              )}
            </div>
          ) : (
            <div className="text-center py-10 space-y-3">
              <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center text-slate-400">
                {isArchive ? <Archive className="w-7 h-7 text-amber-400" /> : <FileText className="w-7 h-7 text-sky-400" />}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-200">
                  {isArchive ? 'Compressed Archive File' : 'Binary / Raw Document'}
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  This format ({file.extension || 'binary'}) is stored securely on the server and ready for instant extraction or download.
                </p>
              </div>

              <div className="pt-2">
                <a
                  href={file.downloadUrl}
                  download={file.originalName}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium rounded-md transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download {file.originalName}</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-2.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>Server path: uploads/{file.serverFilename}</span>
          <span>Status: Verified Stored</span>
        </div>
      </div>
    </div>
  );
};
