import { useState } from 'react';
import Summarizer from './components/Summarizer';
import QuizGen from './components/QuizGen';
import StudyPlanner from './components/StudyPlanner';
import ChatTutor from './components/ChatTutor';
import DocumentUpload from './components/DocumentUpload';
import Flashcards from './components/Flashcards';

const tabs = [
  { id: 'documents',  label: 'Documents',  icon: '📎' },
  { id: 'summarizer', label: 'Summarizer', icon: '📝' },
  { id: 'quiz',       label: 'Quiz Gen',   icon: '🧠' },
  { id: 'flashcards', label: 'Flashcards', icon: '🗂️' },
  { id: 'planner',    label: 'Planner',    icon: '📅' },
  { id: 'chat',       label: 'Chat Tutor', icon: '💬' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('documents');
  const [documentText, setDocumentText] = useState('');
  const [sessionId] = useState(() => {
    let sid = sessionStorage.getItem('campus_session_id');
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem('campus_session_id', sid);
    }
    return sid;
  });

  const renderPanel = () => {
    switch (activeTab) {
      case 'documents':  return (
        <DocumentUpload
          onDocumentParsed={setDocumentText}
          setActiveTab={setActiveTab}
        />
      );
      case 'summarizer': return <Summarizer documentText={documentText} />;
      case 'quiz':       return <QuizGen documentText={documentText} />;
      case 'flashcards': return <Flashcards documentText={documentText} />;
      case 'planner':    return <StudyPlanner documentText={documentText} />;
      case 'chat':       return <ChatTutor documentText={documentText} />;
      default:           return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* ── Premium Ambient Background ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-[120px] mix-blend-screen animate-pulse-glow" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-gradient-mid/10 rounded-full blur-[150px] mix-blend-screen" />
        <div className="absolute top-[20%] right-[10%] w-[25%] h-[25%] bg-gradient-end/10 rounded-full blur-[100px] mix-blend-screen" />
      </div>

      {/* ── Header ── */}
      <header className="glass-panel sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-sm border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-gradient-start via-gradient-mid to-gradient-end flex items-center justify-center text-xl shadow-lg shadow-accent/20">
            🎓
          </div>
          <h1 className="text-xl font-extrabold tracking-tight bg-linear-to-r from-white via-white to-text-secondary bg-clip-text text-transparent">
            Campus Companion
          </h1>
        </div>
        <span className="text-sm font-medium text-text-muted hidden sm:inline-flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
          AI Tutor Active
        </span>
      </header>

      {/* ── Navigation ── */}
      <nav className="px-6 pt-6 pb-2 relative z-10" id="main-nav">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map((t) => (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              onClick={() => setActiveTab(t.id)}
              className={`shrink-0 flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 border ${
                activeTab === t.id
                  ? 'bg-linear-to-r from-accent to-accent-light text-white shadow-lg shadow-accent/30 border-transparent transform -translate-y-0.5'
                  : 'bg-bg-card border-border text-text-secondary hover:text-white hover:bg-bg-card-hover hover:border-accent/40 hover:-translate-y-0.5'
              }`}
            >
              <span className="text-lg opacity-90">{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
              {/* Show a dot on the documents tab when a doc is loaded */}
              {t.id === 'documents' && documentText && activeTab !== 'documents' && (
                <span className="w-2 h-2 rounded-full bg-warning animate-bounce ml-1 shadow-[0_0_8px_var(--color-warning)]" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main className="flex-1 px-6 py-8 max-w-5xl w-full mx-auto relative z-10" id="main-content">
        <div key={activeTab} className="animate-fade-in h-full">
          {renderPanel()}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="px-6 py-6 text-center text-sm font-medium text-text-muted border-t border-border/50 relative z-10 bg-bg-primary/50 backdrop-blur-sm mt-auto">
        Built with ✨ for modern students. Powered by Gemini.
      </footer>
    </div>
  );
}
