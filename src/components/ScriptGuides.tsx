import React, { useState } from 'react';
import { 
  Terminal, 
  Copy, 
  Check, 
  Code2, 
  FileCode, 
  Cpu, 
  Play, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';

interface ScriptGuidesProps {
  serverUrl: string;
  onTestUploadSuccess: () => void;
}

export const ScriptGuides: React.FC<ScriptGuidesProps> = ({ serverUrl, onTestUploadSuccess }) => {
  const [activeTab, setActiveTab] = useState<'python' | 'curl' | 'powershell' | 'node'>('python');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live test state
  const [testFile, setTestFile] = useState<File | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResponse, setTestResponse] = useState<any | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const endpointUrl = `${serverUrl}/api/upload`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Python Script Code
  const pythonScript = `# DropVault Automated PC Upload Script (Python)
# Requirements: pip install requests
import os
import requests
import zipfile
import tempfile

ENDPOINT = "${endpointUrl}"

def upload_file(file_path):
    """Uploads any file, zip, or document to DropVault without authentication"""
    if not os.path.exists(file_path):
        print(f"[!] File not found: {file_path}")
        return None
    
    file_name = os.path.basename(file_path)
    file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
    print(f"[*] Uploading {file_name} ({file_size_mb:.2f} MB) to DropVault...")

    with open(file_path, 'rb') as f:
        # Multi-part POST request with field 'file'
        files = {'file': (file_name, f)}
        headers = {'User-Agent': 'DropVault-PC-Automated-Client/1.0'}
        response = requests.post(ENDPOINT, files=files, headers=headers, timeout=120)

    if response.status_code == 200:
        data = response.json()
        print(f"[+] SUCCESS! Server response: {data.get('message')}")
        print(f"[+] Download available in Admin Panel: {data.get('files', [{}])[0].get('downloadUrl')}")
        return data
    else:
        print(f"[-] FAILED with HTTP {response.status_code}: {response.text}")
        return None

def zip_and_upload_folder(folder_path, archive_name=None):
    """Zips an entire directory on your PC and uploads it in one step"""
    if not os.path.isdir(folder_path):
        print(f"[!] Directory not found: {folder_path}")
        return None
        
    base_name = archive_name or os.path.basename(os.path.normpath(folder_path))
    temp_zip = os.path.join(tempfile.gettempdir(), f"{base_name}.zip")
    
    print(f"[*] Compressing folder '{folder_path}' into {temp_zip}...")
    with zipfile.ZipFile(temp_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(folder_path):
            for file in files:
                abs_path = os.path.join(root, file)
                rel_path = os.path.relpath(abs_path, folder_path)
                zipf.write(abs_path, rel_path)
                
    result = upload_file(temp_zip)
    try:
        os.remove(temp_zip)
    except Exception:
        pass
    return result

if __name__ == "__main__":
    # Example 1: Upload a single file (zip, log, db, backup, etc.)
    # upload_file("C:/my_folder/backup.zip")
    
    # Example 2: Zip & upload a folder automatically
    # zip_and_upload_folder("C:/my_target_folder", "daily_pc_sync")
    print("DropVault Python Uploader ready. Change target file path above and run!")
`;

  // cURL Command
  const curlCommand = `# 1. Upload a single file or ZIP
curl -X POST -F "file=@yourfile.zip" ${endpointUrl}

# 2. Upload multiple files simultaneously
curl -X POST -F "files=@report.pdf" -F "files=@archive.zip" ${endpointUrl}

# 3. Include custom relative path for folder reconstruction
curl -X POST -F "file=@data.csv" -F "path=backups/2026/data.csv" ${endpointUrl}`;

  // PowerShell Command
  const powerShellScript = `# DropVault Upload Script for Windows PowerShell
$Endpoint = "${endpointUrl}"
$TargetFile = "C:\\path\\to\\your\\archive.zip"

Write-Host "Sending $TargetFile to DropVault..."
$Form = @{
    file = Get-Item -Path $TargetFile
}

$Response = Invoke-RestMethod -Uri $Endpoint -Method Post -Form $Form -UserAgent "PowerShell-PC-Sync"
Write-Host "Status: Success! Uploaded file ID: $($Response.files[0].id)"
$Response | ConvertTo-Json -Depth 3`;

  // Node.js script
  const nodeScript = `// Node.js automated upload script
import fs from 'fs';
import path from 'path';

const ENDPOINT = "${endpointUrl}";
const FILE_PATH = "./backup.zip";

async function uploadToDropVault() {
  const fileName = path.basename(FILE_PATH);
  const fileBuffer = fs.readFileSync(FILE_PATH);
  const blob = new Blob([fileBuffer]);
  
  const formData = new FormData();
  formData.append('file', blob, fileName);

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    body: formData,
    headers: {
      'User-Agent': 'Node-PC-Sync/1.0'
    }
  });

  const json = await res.json();
  console.log('Upload Result:', json);
}

uploadToDropVault();`;

  // Handle in-browser test
  const handleTestUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testFile) return;

    setTesting(true);
    setTestError(null);
    setTestResponse(null);

    const formData = new FormData();
    formData.append('file', testFile);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Upload failed');
      }

      setTestResponse(data);
      onTestUploadSuccess();
    } catch (err: any) {
      setTestError(err.message || 'Network error occurred during test upload');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / API Spec */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-sky-400 font-mono uppercase tracking-wider">
                Unauthenticated Multipart Ingestion API
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-100 mt-1">
              Ready-to-use PC Integration Endpoint
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Your PC script can send HTTP POST requests with multipart/form-data. No auth token or header needed. Accepts ZIP, folders, binaries, or any format. Uploaded items appear immediately in the admin panel.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg p-2.5 shrink-0">
            <div className="text-left">
              <span className="text-[10px] text-slate-500 font-mono block">POST ENDPOINT URL</span>
              <span className="text-xs font-mono text-emerald-400 font-medium">
                {endpointUrl}
              </span>
            </div>
            <button
              onClick={() => copyToClipboard(endpointUrl, 'endpoint')}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors ml-2"
              title="Copy endpoint URL"
            >
              {copiedKey === 'endpoint' ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Quick API Parameter Grid */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-500 block text-[11px]">HTTP Method</span>
            <span className="font-mono text-emerald-400 font-semibold">POST</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Field Name</span>
            <span className="font-mono text-slate-200">"file" or "files"</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Authentication</span>
            <span className="font-mono text-sky-400">None (Open API)</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Accepted Formats</span>
            <span className="font-mono text-slate-200">ZIP, Tar, All Files</span>
          </div>
        </div>
      </div>

      {/* Code Snippets Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        {/* Tab switch */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/70 px-4 py-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('python')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'python'
                  ? 'bg-slate-800 text-sky-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Python Script</span>
            </button>

            <button
              onClick={() => setActiveTab('curl')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'curl'
                  ? 'bg-slate-800 text-sky-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>cURL Commands</span>
            </button>

            <button
              onClick={() => setActiveTab('powershell')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'powershell'
                  ? 'bg-slate-800 text-sky-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Windows PowerShell</span>
            </button>

            <button
              onClick={() => setActiveTab('node')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'node'
                  ? 'bg-slate-800 text-sky-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Node.js Fetch</span>
            </button>
          </div>

          <button
            onClick={() => {
              const codeMap = {
                python: pythonScript,
                curl: curlCommand,
                powershell: powerShellScript,
                node: nodeScript
              };
              copyToClipboard(codeMap[activeTab], activeTab);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded transition-colors"
          >
            {copiedKey === activeTab ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>

        {/* Code Content */}
        <div className="p-4 bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto max-h-96">
          <pre className="whitespace-pre">
            {activeTab === 'python' && pythonScript}
            {activeTab === 'curl' && curlCommand}
            {activeTab === 'powershell' && powerShellScript}
            {activeTab === 'node' && nodeScript}
          </pre>
        </div>
      </div>

      {/* Interactive Live API Tester */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">
              Live In-Browser API Tester
            </h3>
            <p className="text-xs text-slate-400">
              Select a file on your computer to test the exact multipart/form-data upload route and inspect the real server response.
            </p>
          </div>
        </div>

        <form onSubmit={handleTestUpload} className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="file"
              onChange={(e) => setTestFile(e.target.files?.[0] || null)}
              className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer bg-slate-950 border border-slate-800 rounded-md p-1.5 flex-1"
            />
            <button
              type="submit"
              disabled={!testFile || testing}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 shadow-sm"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{testing ? 'Sending Request...' : 'Send Test Request'}</span>
            </button>
          </div>

          {/* Test Feedback */}
          {testError && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-md text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{testError}</span>
            </div>
          )}

          {testResponse && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-md space-y-2">
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Upload Handshake Succeeded (HTTP 200 OK)</span>
              </div>
              <pre className="text-[11px] font-mono text-slate-300 bg-slate-900 p-2.5 rounded border border-slate-800 overflow-x-auto">
                {JSON.stringify(testResponse, null, 2)}
              </pre>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
