import { useState, useRef, useCallback } from 'react';
import { parseDocument, ACCEPTED_EXTENSIONS } from '../services/documentParser';

const FILE_TYPE_CONFIG = {
  pdf: { icon: '📕', label: 'PDF Document', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  docx: { icon: '📘', label: 'Word Document', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  pptx: { icon: '📙', label: 'PowerPoint', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  jpg: { icon: '🖼️', label: 'Image', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  png: { icon: '🖼️', label: 'Image', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
};

export default function DocumentUpload({ onDocumentParsed, setActiveTab }) {
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [doc, setDoc] = useState(null); // parsed document result
  const fileInputRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx', 'pptx', 'jpg', 'jpeg', 'png'].includes(ext)) {
      setError('Unsupported file type. Please upload a PDF, DOCX, PPTX, JPG, or PNG file.');
      return;
    }

    setError('');
    setParsing(true);
    setDoc(null);

    try {
      const result = await parseDocument(file);
      setDoc(result);
      onDocumentParsed(result.text);

      // RAG Ingestion
      try {
        const sessionId = sessionStorage.getItem('campus_session_id') || 'unknown';
        fetch('http://localhost:3001/api/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: result.text,
            filename: file.name,
            base64Image: result.base64Image,
            mimeType: result.mimeType,
            sessionId
          })
        })
          .then(res => res.json())
          .then(data => console.log('RAG Ingested:', data))
          .catch(err => console.error('RAG Ingest error:', err));
      } catch (e) {
        console.error('RAG Ingest exception:', e);
      }

    } catch (err) {
      console.error('Parse error:', err);
      setError(`Failed to parse file: ${err.message}`);
    } finally {
      setParsing(false);
    }
  }, [onDocumentParsed]);

  /* ── Drag & Drop Handlers ── */
  const onDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const onBrowse = () => fileInputRef.current?.click();
  const onFileChange = (e) => {
    handleFile(e.target.files[0]);
    e.target.value = ''; // allow re-upload of same file
  };

  const removeDoc = () => {
    setDoc(null);
    onDocumentParsed('');
  };

  const useIn = (tab) => {
    setActiveTab(tab);
  };

  const cfg = doc ? FILE_TYPE_CONFIG[doc.fileType] : null;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-1 flex items-center gap-2">
          <span className="text-3xl">📎</span> Documents
        </h2>
        <p className="text-text-secondary text-sm">
          Upload your study materials to use across all tools — summarize, quiz, plan, and chat with your documents.
        </p>
      </div>

      {/* Upload Zone */}
      {!doc && !parsing && (
        <div
          className={`upload-zone ${dragOver ? 'upload-zone-active' : ''}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={onBrowse}
          id="upload-zone"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            onChange={onFileChange}
            className="hidden"
            id="file-input"
          />

          {/* Icon */}
          <div className="upload-zone-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>

          <p className="text-text-primary font-semibold text-sm mt-4">
            {dragOver ? 'Drop your file here!' : 'Drag & drop your document here'}
          </p>
          <p className="text-text-muted text-xs mt-1">
            or <span className="text-accent-light underline cursor-pointer">browse files</span>
          </p>

          {/* Supported formats */}
          <div className="flex items-center gap-3 mt-5">
            {Object.entries(FILE_TYPE_CONFIG).map(([ext, cfg]) => (
              <span
                key={ext}
                className="file-type-badge"
                style={{ color: cfg.color, background: cfg.bg }}
              >
                {cfg.icon} .{ext}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Parsing State */}
      {parsing && (
        <div className="card animate-fade-in">
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="upload-spinner" />
            <div className="text-center">
              <p className="text-sm font-semibold text-text-primary">Parsing your document…</p>
              <p className="text-xs text-text-muted mt-1">Extracting text content</p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card border-error/50 animate-fade-in">
          <p className="text-sm text-error font-medium flex items-center gap-2">
            <span>⚠️</span> {error}
          </p>
          <button className="btn-ghost text-xs mt-2" onClick={() => setError('')}>
            Dismiss
          </button>
        </div>
      )}

      {/* Document Preview */}
      {doc && (
        <div className="animate-slide-up space-y-4">
          {/* Doc Info Card */}
          <div className="doc-preview-card" id="doc-preview">
            <div className="flex items-start gap-4">
              {/* File icon */}
              <div
                className="shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                style={{ background: cfg.bg, color: cfg.color }}
              >
                {cfg.icon}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-text-primary font-semibold text-sm truncate">
                  {doc.fileName}
                </h3>
                <p className="text-text-muted text-xs mt-0.5">{cfg.label}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-xs text-text-secondary flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                    {doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'}
                  </span>
                  <span className="text-xs text-text-secondary flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                    {doc.wordCount.toLocaleString()} words
                  </span>
                </div>
              </div>

              {/* Remove button */}
              <button
                className="btn-ghost text-xs text-error shrink-0"
                onClick={removeDoc}
                title="Remove document"
                id="remove-doc-btn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Remove
              </button>
            </div>

            {/* Text preview */}
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-[11px] uppercase tracking-widest font-semibold text-text-muted mb-2">
                Document Preview
              </p>
              {doc.base64Image ? (
                <img src={`data:${doc.mimeType};base64,${doc.base64Image}`} alt="preview" className="w-full max-h-48 object-contain rounded-lg border border-border" />
              ) : (
                <p className="text-xs text-text-secondary leading-relaxed line-clamp-4">
                  {doc.text.slice(0, 600)}{doc.text.length > 600 ? '…' : ''}
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card" id="doc-quick-actions">
            <p className="text-xs uppercase tracking-widest font-semibold text-text-muted mb-3">
              Use this document in
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <button className="doc-action-btn" onClick={() => useIn('summarizer')}>
                <span className="text-lg">📝</span>
                <div className="text-left">
                  <span className="text-sm font-semibold text-text-primary">Summarizer</span>
                  <span className="block text-[11px] text-text-muted">Get bullet-point summaries</span>
                </div>
              </button>
              <button className="doc-action-btn" onClick={() => useIn('quiz')}>
                <span className="text-lg">🧠</span>
                <div className="text-left">
                  <span className="text-sm font-semibold text-text-primary">Quiz Generator</span>
                  <span className="block text-[11px] text-text-muted">Test your knowledge</span>
                </div>
              </button>
              <button className="doc-action-btn" onClick={() => useIn('planner')}>
                <span className="text-lg">📅</span>
                <div className="text-left">
                  <span className="text-sm font-semibold text-text-primary">Study Planner</span>
                  <span className="block text-[11px] text-text-muted">Plan your study sessions</span>
                </div>
              </button>
              <button className="doc-action-btn" onClick={() => useIn('chat')}>
                <span className="text-lg">💬</span>
                <div className="text-left">
                  <span className="text-sm font-semibold text-text-primary">Chat Tutor</span>
                  <span className="block text-[11px] text-text-muted">Ask questions about it</span>
                </div>
              </button>
            </div>
          </div>

          {/* Replace */}
          <div className="flex justify-center">
            <button
              className="btn-ghost text-sm"
              onClick={() => { removeDoc(); }}
              id="replace-doc-btn"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload a different document
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
