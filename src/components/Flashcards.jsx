import { useState } from 'react';
import { generateFlashcards } from '../services/mockAI';

export default function Flashcards({ documentText }) {
  const [focusTopic, setFocusTopic] = useState('');
  const [cards, setCards]           = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped]   = useState(false);
  const [loading, setLoading]       = useState(false);
  const [generated, setGenerated]   = useState(false);

  const hasDoc = Boolean(documentText);

  const handleGenerate = async () => {
    const query = focusTopic.trim() || 'important vocabulary, terms, definitions, and key concepts';
    setLoading(true);
    setIsFlipped(false);
    setCurrentIndex(0);
    setCards([]);
    try {
      const generated = await generateFlashcards(query);
      setCards(generated);
      setGenerated(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const nextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % cards.length);
    }, 150);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
    }, 150);
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
        <div className="upload-spinner" />
        <p className="text-text-secondary font-medium">Generating your study deck…</p>
        {focusTopic && (
          <p className="text-xs text-text-muted">Focused on: <em>{focusTopic}</em></p>
        )}
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary mb-1 flex items-center gap-2">
            <span className="text-3xl">🗂️</span> Flashcards
          </h2>
          <p className="text-text-secondary text-sm">Master key concepts with 3D interactive cards.</p>
        </div>
        {cards.length > 0 && (
          <div className="text-right">
            <span className="text-xs font-bold text-accent px-3 py-1 bg-accent/10 rounded-full border border-accent/20">
              {currentIndex + 1} / {cards.length}
            </span>
          </div>
        )}
      </div>

      {/* ── Generation controls (always visible when no cards, or as a collapsible strip) ── */}
      {(!generated || cards.length === 0) && (
        <div className="space-y-4">

          {/* RAG / no-doc banners */}
          {hasDoc ? (
            <div className="doc-banner" id="flashcards-doc-banner">
              <div className="doc-banner-icon">📎</div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-text-primary text-sm">Document loaded via RAG</span>
                <span className="block text-[11px] text-text-muted truncate">
                  Flashcards will be drawn from the most relevant sections of your document
                </span>
              </div>
            </div>
          ) : (
            <div className="card border-dashed border-accent/30 flex items-center gap-3 py-3 px-4">
              <span className="text-2xl">💡</span>
              <p className="text-sm text-text-secondary">
                <strong className="text-text-primary">Tip:</strong> Upload a document in the{' '}
                <strong className="text-accent-light">Documents</strong> tab to generate flashcards
                from your own study material.
              </p>
            </div>
          )}

          {/* Focus topic input + generate button */}
          <div className="card space-y-4">
            {hasDoc && (
              <div>
                <label className="block text-xs uppercase tracking-widest font-semibold text-text-muted mb-2">
                  Focus Topic <span className="normal-case font-normal text-text-muted/60">(optional)</span>
                </label>
                <input
                  id="flashcards-focus-input"
                  type="text"
                  className="input-field"
                  placeholder="e.g. biology terms, Chapter 4 vocab, key dates…"
                  value={focusTopic}
                  onChange={(e) => setFocusTopic(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate(); }}
                />
                <p className="text-[11px] text-text-muted mt-1.5">
                  Leave blank to generate from the document's most important concepts.
                </p>
              </div>
            )}

            <button
              id="generate-flashcards-btn"
              className="btn-primary w-full"
              onClick={handleGenerate}
            >
              🗂️ {hasDoc ? 'Generate Flashcards from Document' : 'Generate Demo Flashcards'}
            </button>
          </div>
        </div>
      )}

      {/* ── Card Viewer ── */}
      {cards.length > 0 && (
        <div className="space-y-6 animate-fade-in">
          {/* Regenerate strip */}
          <div className="flex items-center gap-3">
            <input
              id="flashcards-refocus-input"
              type="text"
              className="input-field flex-1 text-sm"
              placeholder="Change focus topic and regenerate…"
              value={focusTopic}
              onChange={(e) => setFocusTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate(); }}
            />
            <button
              onClick={handleGenerate}
              className="btn-secondary shrink-0 text-sm"
            >
              Regenerate
            </button>
          </div>

          {/* 3D Card Container */}
          <div className="flex justify-center perspective-1000">
            <div
              className={`relative w-full max-w-lg aspect-4/3 cursor-pointer transition-all duration-700 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}
              onClick={() => setIsFlipped(!isFlipped)}
            >
              {/* Front */}
              <div className="absolute inset-0 backface-hidden">
                <div className="h-full w-full glass-panel rounded-3xl p-8 flex flex-col items-center justify-center text-center border-2 border-white/5 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-4 left-4 text-xs font-bold text-text-muted uppercase tracking-widest">Question / Term</div>
                  <div className="text-2xl font-bold text-text-primary leading-tight">
                    {currentCard.front}
                  </div>
                  <div className="absolute bottom-6 text-xs text-text-muted animate-bounce opacity-50 group-hover:opacity-100 transition-opacity">
                    Click to flip 🔄
                  </div>
                  <div className="absolute -top-10 -right-10 w-24 h-24 bg-accent/10 blur-2xl rounded-full" />
                </div>
              </div>

              {/* Back */}
              <div className="absolute inset-0 backface-hidden rotate-y-180">
                <div className="h-full w-full bg-linear-to-br from-bg-card to-[#1a1a20] rounded-3xl p-8 flex flex-col items-center justify-center text-center border-2 border-accent/20 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-4 left-4 text-xs font-bold text-accent uppercase tracking-widest">Answer / Definition</div>
                  <div className="text-lg text-text-secondary leading-relaxed">
                    {currentCard.back}
                  </div>
                  <div className="absolute bottom-6 text-xs text-text-muted opacity-50">
                    Click to flip back 🔄
                  </div>
                  <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-accent/10 blur-2xl rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={prevCard}
              className="w-12 h-12 rounded-full glass-panel flex items-center justify-center text-xl hover:bg-white/10 transition-colors border-white/5 active:scale-95"
              title="Previous Card"
            >
              ←
            </button>
            <div className="text-xs text-text-muted font-medium">
              {currentIndex + 1} of {cards.length}
            </div>
            <button
              onClick={nextCard}
              className="w-12 h-12 rounded-full bg-linear-to-r from-accent to-accent-light flex items-center justify-center text-xl text-white shadow-lg shadow-accent/20 active:scale-95"
              title="Next Card"
            >
              →
            </button>
          </div>

          {/* Keyboard Hint */}
          <p className="text-center text-[10px] text-text-muted uppercase tracking-[0.2em] font-medium opacity-50">
            Tip: Click the card to flip • use arrows to navigate
          </p>
        </div>
      )}
    </div>
  );
}
