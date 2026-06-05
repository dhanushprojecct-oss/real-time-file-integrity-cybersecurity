import { CheckCircle, File, FolderOpen, Hash, Loader, Trash2, Upload as UploadIcon, XCircle } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import api from '../api/client'

const ALLOWED = ['pdf', 'docx', 'txt', 'xlsx', 'xls', 'jpg', 'jpeg', 'png', 'zip', 'csv', 'log', 'xml', 'json', 'py', 'js', 'html', 'css']

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileItem({ file, result }) {
  const isUploading = !result
  const success = result?.status === 'uploaded'

  return (
    <div className="flex items-center gap-3 p-3 bg-cyber-surface rounded-lg border border-cyber-border/50">
      <File size={18} className={success ? 'text-cyber-green' : isUploading ? 'text-cyber-cyan' : 'text-cyber-red'} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-cyber-text font-medium truncate">{file.name}</p>
        <p className="text-xs text-cyber-muted">{formatSize(file.size)}</p>
        {result?.hash && (
          <p className="hash-text mt-1 truncate">{result.hash}</p>
        )}
      </div>
      <div className="flex-shrink-0">
        {isUploading ? (
          <Loader size={16} className="text-cyber-cyan animate-spin" />
        ) : success ? (
          <CheckCircle size={16} className="text-cyber-green" />
        ) : (
          <XCircle size={16} className="text-cyber-red" />
        )}
      </div>
    </div>
  )
}

export default function Upload() {
  const [files, setFiles] = useState([])
  const [results, setResults] = useState({})
  const [uploading, setUploading] = useState(false)
  const [uploadedHistory, setUploadedHistory] = useState([])

  const onDrop = useCallback((accepted, rejected) => {
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name))
      const newFiles = accepted.filter((f) => !names.has(f.name))
      return [...prev, ...newFiles]
    })
    if (rejected.length > 0) {
      toast.error(`${rejected.length} file(s) rejected — unsupported type`)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: Object.fromEntries(ALLOWED.map((ext) => [`application/${ext}`, [`.${ext}`]])),
    noClick: false,
    multiple: true,
  })

  const removeFile = (name) => {
    setFiles((f) => f.filter((x) => x.name !== name))
    setResults((r) => { const copy = { ...r }; delete copy[name]; return copy })
  }

  const handleUpload = async () => {
    if (files.length === 0) { toast.error('No files selected'); return }
    setUploading(true)

    const formData = new FormData()
    files.forEach((f) => formData.append('files', f))

    try {
      const { data } = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const resultMap = {}
      data.files.forEach((r) => { resultMap[r.file_name] = r })
      setResults(resultMap)

      const successful = data.files.filter((r) => r.status === 'uploaded')
      setUploadedHistory((h) => [...successful, ...h])

      toast.success(`${successful.length} file(s) uploaded and hashed successfully`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const clearAll = () => { setFiles([]); setResults({}) }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Upload Files for Monitoring</h2>
        <p className="text-cyber-muted text-sm mt-0.5">
          Files are hashed with SHA-256 and monitored in real time after upload
        </p>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${isDragActive
          ? 'border-cyber-cyan bg-cyber-cyan/5 glow-cyan'
          : 'border-cyber-border hover:border-cyber-cyan/50 hover:bg-cyber-surface/50'
          }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3 pointer-events-none">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${isDragActive ? 'bg-cyber-cyan/20 border-cyber-cyan/50' : 'bg-cyber-surface border-cyber-border'
            }`}>
            <UploadIcon size={28} className={isDragActive ? 'text-cyber-cyan' : 'text-cyber-muted'} />
          </div>
          <div>
            <p className="text-white font-semibold">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-cyber-muted text-sm mt-1">or click to browse files</p>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-center mt-1">
            {ALLOWED.map((ext) => (
              <span key={ext} className="text-xs bg-cyber-surface border border-cyber-border text-cyber-muted px-2 py-0.5 rounded-full uppercase">
                .{ext}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Folder upload hint */}
      <div className="flex items-center gap-2 text-xs text-cyber-muted">
        <FolderOpen size={13} />
        <span>To upload an entire folder, use your OS file picker and select multiple files (Ctrl+A)</span>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="cyber-card space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-white">
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </h3>
            <button onClick={clearAll} className="text-xs text-cyber-muted hover:text-cyber-red transition-colors flex items-center gap-1">
              <Trash2 size={12} /> Clear all
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {files.map((f) => (
              <div key={f.name} className="flex items-center gap-2">
                <div className="flex-1">
                  <FileItem file={f} result={results[f.name]} />
                </div>
                {!uploading && !results[f.name] && (
                  <button onClick={() => removeFile(f.name)}
                    className="p-1.5 text-cyber-muted hover:text-cyber-red transition-colors rounded">
                    <XCircle size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            id="upload-btn"
            onClick={handleUpload}
            disabled={uploading}
            className="btn-primary w-full justify-center py-2.5 mt-2"
          >
            {uploading ? (
              <><Loader size={15} className="animate-spin" /> Uploading & Hashing...</>
            ) : (
              <><Hash size={15} /> Upload & Generate SHA-256 Hashes</>
            )}
          </button>
        </div>
      )}

      {/* Upload history this session */}
      {uploadedHistory.length > 0 && (
        <div className="cyber-card">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle size={15} className="text-cyber-green" />
            Uploaded This Session
          </h3>
          <div className="overflow-auto">
            <table className="cyber-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Size</th>
                  <th>SHA-256 Hash</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {uploadedHistory.map((r, i) => (
                  <tr key={i}>
                    <td className="font-medium text-cyber-text text-xs">{r.file_name}</td>
                    <td className="text-xs text-cyber-muted">{formatSize(r.file_size)}</td>
                    <td className="font-mono text-xs text-cyber-cyan/80 max-w-xs">
                      <span className="truncate block">{r.hash}</span>
                    </td>
                    <td>
                      <span className="badge-safe">✓ Monitored</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
