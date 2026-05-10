import { useState } from 'react';
import { summarizeText } from '../services/mockAI';

export default function Summarizer({ documentText }) {
  const [focusTopic, setFocusTopic] = useState('');
  const [bullets, setBullets]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [copied, setCopied]         = useState(false);
  const [pasteText, setPasteText]   = useState('');   // fallback when no doc

  const hasDoc = Boolean(documentText);

  // ── summarize via RAG (document loaded) ─────────────────────────────────
  const handleSummarizeDoc = async () => {
    const query = focusTopic.trim() || 'key concepts and main ideas';
    setLoading(true);
    setBullets([]);
    try {
      const result = await summarizeText(query);
      setBullets(result);
    } finally {
      setLoading(false);
    }
  };

  // ── summarize pasted text (no doc) ──────────────────────────────────────
  const handleSummarizePaste = async () => {
    if (!pasteText.trim()) return;
    setLoading(true);
    setBullets([]);
    try {
      const result = await summarizeText(pasteText);
      setBullets(result);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    const content = bullets.map((b, i) => `${i + 1}. ${b}`).join('\n');
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard not available */ }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-1 flex items-center gap-2">
          <span className="text-3xl">📝</span> Text Summarizer
        </h2>
        <p className="text-text-secondary text-sm">
          {hasDoc
            ? 'Your uploaded document is ready — optionally narrow the focus, then hit Summarize.'
            : 'Paste your notes or lecture content and get a concise bulleted summary.'}
        </p>
      </div>

      {/* ── DOCUMENT MODE ── */}
      {hasDoc ? (
        <div className="space-y-4 animate-fade-in">
          {/* Doc context banner */}
          <div className="doc-banner" id="summarizer-doc-banner">
            <div className="doc-banner-icon">📎</div>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-text-primary text-sm">Document loaded via RAG</span>
              <span className="block text-[11px] text-text-muted truncate">
                {documentText.split(/\s+/).filter(Boolean).length.toLocaleString()} words indexed — the AI will retrieve the most relevant sections
              </span>
            </div>
          </div>

          {/* Optional focus topic input */}
          <div className="card space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-widest font-semibold text-text-muted mb-2">
                Focus Topic <span className="normal-case font-normal text-text-muted/60">(optional)</span>
              </label>
              <input
                id="summarizer-focus-input"
                type="text"
                className="input-field"
                placeholder="e.g. Chapter 3 key points, photosynthesis, World War II causes…"
                value={focusTopic}
                onChange={(e) => setFocusTopic(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSummarizeDoc(); }}
              />
              <p className="text-[11px] text-text-muted mt-1.5">
                Leave blank to summarize the whole document's main ideas.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                id="summarize-btn"
                className="btn-primary"
                onClick={handleSummarizeDoc}
                disabled={loading}
              >
                {loading ? (
                  <><span className="loader" /> Summarizing…</>
                ) : (
                  <>📝 Summarize Document</>
                )}
              </button>
            </div>
          </div>
        </div>

      ) : (
        /* ── NO-DOCUMENT FALLBACK MODE ── */
        <div className="space-y-4 animate-fade-in">
          {/* Upload nudge banner */}
          <div className="card border-dashed border-accent/30 flex items-center gap-3 py-3 px-4">
            <span className="text-2xl">💡</span>
            <p className="text-sm text-text-secondary">
              <strong className="text-text-primary">Tip:</strong> Upload a document in the{' '}
              <strong className="text-accent-light">Documents</strong> tab to enable RAG-powered summaries
              that intelligently search your study material.
            </p>
          </div>

          <div className="card">
            <textarea
              id="summarizer-input"
              className="input-field min-h-[180px]"
              placeholder="Paste your notes, lecture content, or any text you'd like summarized…"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-text-muted">
                {pasteText.length > 0
                  ? `${pasteText.split(/\s+/).filter(Boolean).length} words`
                  : 'No input yet'}
              </span>
              <button
                id="summarize-btn"
                className="btn-primary"
                onClick={handleSummarizePaste}
                disabled={loading || !pasteText.trim()}
              >
                {loading ? (
                  <><span className="loader" /> Summarizing…</>
                ) : (
                  'Summarize'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shimmer Loading Skeleton */}
      {loading && (
        <div className="card animate-fade-in space-y-4" aria-label="Loading summary">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-sm text-text-muted">Analyzing your document…</span>
          </div>
          <div className="shimmer-line w-full" />
          <div className="shimmer-line w-4/5" />
          <div className="shimmer-line w-11/12" />
          <div className="shimmer-line w-3/5" />
        </div>
      )}

      {/* Output */}
      {!loading && bullets.length > 0 && (
        <div className="card animate-slide-up" id="summary-output">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success" />
              Summary {focusTopic && hasDoc && <span className="text-sm font-normal text-text-muted">— {focusTopic}</span>}
            </h3>
            <button
              id="copy-summary-btn"
              className="btn-ghost text-xs"
              onClick={handleCopy}
              title="Copy summary to clipboard"
            >
              {copied ? (
                <><span className="text-success">✓</span> Copied</>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
          <ul className="space-y-2">
            {bullets.map((b, i) => (
              <li
                key={i}
                className="animate-stagger-item flex items-start gap-3 text-sm text-text-secondary leading-relaxed"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-light shrink-0" />
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
