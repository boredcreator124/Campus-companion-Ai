import { useState } from 'react';
import { generateQuiz } from '../services/mockAI';

export default function QuizGen({ documentText }) {
  const [focusTopic, setFocusTopic] = useState('');
  const [quiz, setQuiz]             = useState([]);
  const [loading, setLoading]       = useState(false);
  const [selected, setSelected]     = useState({});
  const [showResults, setShowResults] = useState(false);
  const [pasteText, setPasteText]   = useState(''); // fallback when no doc

  const hasDoc = Boolean(documentText);

  // ── generate quiz via RAG (document loaded) ──────────────────────────────
  const handleGenerateDoc = async () => {
    const query = focusTopic.trim() || 'core concepts and essential ideas';
    setLoading(true);
    setShowResults(false);
    setSelected({});
    setQuiz([]);
    try {
      const result = await generateQuiz(query);
      setQuiz(result);
    } finally {
      setLoading(false);
    }
  };

  // ── generate quiz from pasted text (no doc) ──────────────────────────────
  const handleGeneratePaste = async () => {
    if (!pasteText.trim()) return;
    setLoading(true);
    setShowResults(false);
    setSelected({});
    setQuiz([]);
    try {
      const result = await generateQuiz(pasteText);
      setQuiz(result);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (qId, option) => {
    if (showResults) return;
    setSelected((prev) => ({ ...prev, [qId]: option }));
  };

  const handleSubmit = () => setShowResults(true);

  const answeredCount = Object.keys(selected).length;
  const score = quiz.reduce(
    (acc, q) => acc + (selected[q.id] === q.answer ? 1 : 0),
    0
  );

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-1 flex items-center gap-2">
          <span className="text-3xl">🧠</span> Quiz Generator
        </h2>
        <p className="text-text-secondary text-sm">
          {hasDoc
            ? 'Generate a 5-question quiz from your uploaded document using AI-powered RAG retrieval.'
            : 'Paste content and generate a 5-question quiz to test your knowledge.'}
        </p>
      </div>

      {/* ── DOCUMENT MODE ── */}
      {hasDoc ? (
        <div className="space-y-4 animate-fade-in">
          {/* RAG context banner */}
          <div className="doc-banner" id="quizgen-doc-banner">
            <div className="doc-banner-icon">📎</div>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-text-primary text-sm">Document loaded via RAG</span>
              <span className="block text-[11px] text-text-muted truncate">
                Quiz questions will be generated from the most relevant sections of your document
              </span>
            </div>
          </div>

          {/* Optional focus topic */}
          <div className="card space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-widest font-semibold text-text-muted mb-2">
                Focus Topic <span className="normal-case font-normal text-text-muted/60">(optional)</span>
              </label>
              <input
                id="quizgen-focus-input"
                type="text"
                className="input-field"
                placeholder="e.g. Chapter 2 definitions, photosynthesis, the French Revolution…"
                value={focusTopic}
                onChange={(e) => setFocusTopic(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleGenerateDoc(); }}
              />
              <p className="text-[11px] text-text-muted mt-1.5">
                Leave blank to quiz on the document's core concepts.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                id="generate-quiz-btn"
                className="btn-primary"
                onClick={handleGenerateDoc}
                disabled={loading}
              >
                {loading ? (
                  <><span className="loader" /> Generating…</>
                ) : (
                  <>🧠 Generate Quiz</>
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
              <strong className="text-accent-light">Documents</strong> tab to enable RAG-powered quizzes
              generated directly from your study material.
            </p>
          </div>

          <div className="card">
            <textarea
              id="quizgen-input"
              className="input-field min-h-[140px]"
              placeholder="Paste study material to generate quiz questions from…"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            <div className="flex justify-end mt-4">
              <button
                id="generate-quiz-btn"
                className="btn-primary"
                onClick={handleGeneratePaste}
                disabled={loading || !pasteText.trim()}
              >
                {loading ? (
                  <><span className="loader" /> Generating…</>
                ) : (
                  'Generate Quiz'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shimmer Loading Skeleton */}
      {loading && (
        <div className="space-y-4 animate-fade-in">
          {[1, 2, 3].map((n) => (
            <div key={n} className="card space-y-3">
              <div className="shimmer-line w-3/4 h-4" />
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="shimmer-line h-10 rounded-lg" />
                <div className="shimmer-line h-10 rounded-lg" />
                <div className="shimmer-line h-10 rounded-lg" />
                <div className="shimmer-line h-10 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Questions */}
      {!loading && quiz.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          {/* Progress Bar */}
          {!showResults && (
            <div className="card animate-slide-up" id="quiz-progress">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-widest">
                  Progress
                </span>
                <span className="text-xs font-bold text-accent-light">
                  {answeredCount} of {quiz.length} answered
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${(answeredCount / quiz.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {quiz.map((q, qi) => (
            <div
              key={q.id}
              className="card animate-stagger-item"
              id={`quiz-q-${q.id}`}
              style={{ animationDelay: `${qi * 80}ms` }}
            >
              <div className="flex items-start gap-3 mb-3">
                <span className="shrink-0 w-7 h-7 rounded-lg bg-accent/20 text-accent-light text-xs font-bold flex items-center justify-center">
                  {q.id}
                </span>
                <div>
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-text-muted">
                    {q.type === 'mcq' ? 'Multiple Choice' : 'True / False'}
                  </span>
                  <p className="text-sm text-text-primary mt-0.5">{q.question}</p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {q.options.map((opt) => {
                  let cls =
                    'text-left w-full px-4 py-2.5 rounded-lg border text-sm transition-all cursor-pointer active:scale-[0.97] ';
                  if (showResults) {
                    if (opt === q.answer) {
                      cls += 'border-success bg-success/10 text-success';
                    } else if (selected[q.id] === opt) {
                      cls += 'border-error bg-error/10 text-error';
                    } else {
                      cls += 'border-border bg-bg-input text-text-muted';
                    }
                  } else if (selected[q.id] === opt) {
                    cls += 'border-accent bg-accent/10 text-accent-light';
                  } else {
                    cls += 'border-border bg-bg-input text-text-secondary hover:border-accent/50';
                  }

                  return (
                    <button
                      key={opt}
                      className={cls}
                      onClick={() => handleSelect(q.id, opt)}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Submit / Score */}
          <div className="flex items-center justify-between">
            {!showResults ? (
              <button
                id="submit-quiz-btn"
                className="btn-primary"
                onClick={handleSubmit}
                disabled={answeredCount < quiz.length}
              >
                Submit Answers
              </button>
            ) : (
              <div className="card flex items-center gap-4 w-full animate-slide-up" id="quiz-score">
                <div className="animate-score-pop w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center text-xl font-bold text-accent-light">
                  {score}/{quiz.length}
                </div>
                <div>
                  <p className="text-text-primary font-semibold">
                    {score === quiz.length
                      ? '🎉 Perfect score!'
                      : score >= 3
                        ? '👍 Good job!'
                        : '📚 Keep studying!'}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    You got {score} out of {quiz.length} correct
                  </p>
                </div>
                <button
                  className="btn-secondary ml-auto text-sm"
                  onClick={hasDoc ? handleGenerateDoc : handleGeneratePaste}
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
