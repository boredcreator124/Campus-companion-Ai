import { useState, useEffect, useRef } from 'react';
import { chatResponse } from '../services/mockAI';

export default function ChatTutor({ documentText }) {
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content:
        "👋 Hi! I'm your Campus Companion tutor. Ask me anything about your coursework, study strategies, or concepts you're struggling with.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [autoSendVoice, setAutoSendVoice] = useState(false);
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Show a system message when document context changes
  useEffect(() => {
    if (documentText) {
      setMessages((prev) => {
        // Avoid duplicates — don't re-add if last non-user message is the doc context notice
        const last = prev[prev.length - 1];
        if (last && last.role === 'system') return prev;
        return [
          ...prev,
          {
            role: 'system',
            content: `📎 A document has been loaded (${documentText.split(/\s+/).filter(Boolean).length.toLocaleString()} words). I can now answer questions about it — just ask!`,
          },
        ];
      });
    }
  }, [documentText]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsRecording(true);
      
      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
             currentTranscript += event.results[i][0].transcript;
          }
        }
        if (currentTranscript) {
          setInput(prev => (prev + ' ' + currentTranscript).trim());
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
        if (autoSendVoice) {
           // We use a timeout to let the state update settle before sending
           setTimeout(() => {
              const sendBtn = document.getElementById('chat-send-btn');
              if (sendBtn) sendBtn.click();
           }, 300);
        }
      };

      recognition.onerror = (e) => {
        console.error("Speech recognition error", e);
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, [autoSendVoice]);

  const toggleRecording = () => {
    if (!recognitionRef.current) return alert("Speech Recognition not supported in this browser.");
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setInput(''); // clear input before recording
      recognitionRef.current.start();
    }
  };

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || loading) return;

    const userMessage = { role: 'user', content: msg };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // RAG retrieval is handled server-side via sessionId.
      // We just send the raw user message — no need to inject document text here.
      setMessages((prev) => [...prev, { role: 'ai', content: '' }]);

      await chatResponse(msg, messages, (textChunk) => {
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { role: 'ai', content: textChunk };
          return newMessages;
        });
      });

    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="animate-fade-in flex flex-col h-full" style={{ minHeight: 'calc(100vh - 220px)' }}>
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-text-primary mb-1 flex items-center gap-2">
          <span className="text-3xl">💬</span> Chat Tutor
        </h2>
        <p className="text-text-secondary text-sm">
          Ask questions and get instant explanations on any topic.
        </p>
      </div>

      {/* Document Context Banner */}
      {documentText && (
        <div className="doc-banner mb-4" id="chat-doc-banner">
          <div className="doc-banner-icon">📎</div>
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-text-primary text-sm">Document context active</span>
            <span className="block text-[11px] text-text-muted truncate">
              Your questions will reference the uploaded document
            </span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className="card flex-1 overflow-y-auto space-y-4 mb-4"
        id="chat-messages"
        style={{ maxHeight: 'calc(100vh - 360px)' }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-linear-to-br from-gradient-start to-gradient-mid text-white rounded-br-md'
                  : m.role === 'system'
                    ? 'bg-accent/10 border border-accent/20 text-accent-light rounded-bl-md italic'
                    : 'bg-bg-secondary border border-border text-text-secondary rounded-bl-md'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-bg-secondary border border-border rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5 items-center">
              <span className="w-2 h-2 rounded-full bg-accent-light animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-accent-light animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-accent-light animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
           <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer hover:text-text-primary transition-colors">
              <input 
                type="checkbox" 
                checked={autoSendVoice}
                onChange={(e) => setAutoSendVoice(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-border bg-bg-input text-accent focus:ring-accent"
              />
              Auto-send voice message
           </label>
        </div>
        <div className="flex gap-3 items-end">
          <textarea
            id="chat-input"
            className="input-field flex-1 resize-none"
            rows={1}
            placeholder={documentText ? "Ask about your document…" : "Type your question…"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />
          <button
            id="chat-send-btn"
            className="btn-primary shrink-0 h-[44px]"
            onClick={handleSend}
            disabled={loading || !input.trim()}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
          <button
            className={`shrink-0 h-[44px] w-[44px] flex items-center justify-center rounded-lg transition-all duration-300 ${
              isRecording 
                ? 'bg-error text-white shadow-[0_0_15px_var(--color-error)] animate-pulse' 
                : 'bg-bg-input border border-border text-text-secondary hover:border-accent hover:text-accent'
            }`}
            onClick={toggleRecording}
            disabled={loading}
            title="Hold to talk"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="22"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
