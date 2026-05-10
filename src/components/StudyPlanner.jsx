import { useState, useMemo } from 'react';
import { generateStudyPlan } from '../services/mockAI';

/** Calculate interval stats between now and target date */
function calcIntervals(targetDateStr, subjectCount) {
  if (!targetDateStr || subjectCount === 0) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(targetDateStr);
  target.setHours(0, 0, 0, 0);

  const diffMs = target - now;
  const totalDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  // Assume 6 productive study hours per day
  const hoursPerDay = 6;
  const totalHours = totalDays * hoursPerDay;
  const hoursPerSubject = subjectCount > 0 ? Math.round(totalHours / subjectCount) : 0;

  // Spaced-repetition phases
  const learnDays = Math.max(1, Math.round(totalDays * 0.6));
  const reinforceDays = Math.max(1, Math.round(totalDays * 0.25));
  const testDays = Math.max(1, totalDays - learnDays - reinforceDays);

  // Urgency level
  let urgency = 'relaxed';   // 14+ days
  if (totalDays < 7) urgency = 'critical';
  else if (totalDays < 14) urgency = 'focused';

  return {
    totalDays,
    totalHours,
    hoursPerSubject,
    hoursPerDay,
    learnDays,
    reinforceDays,
    testDays,
    urgency,
    isPast: diffMs < 0,
  };
}

const urgencyConfig = {
  relaxed:  { label: 'On Track',   color: 'bg-success',  textColor: 'text-success',  emoji: '🟢' },
  focused:  { label: 'Stay Focused', color: 'bg-warning', textColor: 'text-warning', emoji: '🟡' },
  critical: { label: 'Crunch Time', color: 'bg-error',    textColor: 'text-error',    emoji: '🔴' },
};

export default function StudyPlanner({ documentText }) {
  const [date, setDate] = useState('');
  const [subjectInput, setSubjectInput] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [plan, setPlan] = useState([]);
  const [loading, setLoading] = useState(false);

  const intervals = useMemo(
    () => calcIntervals(date, subjects.length),
    [date, subjects.length]
  );

  const addSubject = () => {
    const s = subjectInput.trim();
    if (s && !subjects.includes(s)) {
      setSubjects((prev) => [...prev, s]);
      setSubjectInput('');
    }
  };

  const removeSubject = (s) => setSubjects((prev) => prev.filter((x) => x !== s));

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSubject();
    }
  };

  const handleGenerate = async () => {
    if (!date || subjects.length === 0) return;
    setLoading(true);
    try {
      const result = await generateStudyPlan(new Date(date), subjects);
      setPlan(result);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-1 flex items-center gap-2">
          <span className="text-3xl">📅</span> Study Planner
        </h2>
        <p className="text-text-secondary text-sm">
          Set a target date and your subjects to get a structured study timetable with spaced-repetition intervals.
        </p>
      </div>

      {/* Document Banner */}
      {documentText && (
        <div className="doc-banner" id="planner-doc-banner">
          <div className="doc-banner-icon">📎</div>
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-text-primary text-sm">Document attached</span>
            <span className="block text-[11px] text-text-muted truncate">
              Your uploaded material will inform the study plan when using a real AI
            </span>
          </div>
        </div>
      )}

      {/* Inputs */}
      <div className="card space-y-4">
        {/* Date */}
        <div>
          <label htmlFor="planner-date" className="block text-xs font-semibold text-text-muted uppercase tracking-widest mb-1">
            Exam / Target Date
          </label>
          <input
            id="planner-date"
            type="date"
            className="input-field"
            value={date}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* Subjects */}
        <div>
          <label htmlFor="planner-subject" className="block text-xs font-semibold text-text-muted uppercase tracking-widest mb-1">
            Subjects
          </label>
          <div className="flex gap-2">
            <input
              id="planner-subject"
              className="input-field flex-1"
              placeholder="e.g. Linear Algebra"
              value={subjectInput}
              onChange={(e) => setSubjectInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="btn-primary shrink-0" onClick={addSubject} type="button">
              Add
            </button>
          </div>
          {subjects.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {subjects.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/15 text-accent-light text-xs font-medium"
                >
                  {s}
                  <button
                    className="hover:text-error transition-colors text-base leading-none"
                    onClick={() => removeSubject(s)}
                    aria-label={`Remove ${s}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            id="generate-plan-btn"
            className="btn-primary"
            onClick={handleGenerate}
            disabled={loading || !date || subjects.length === 0}
          >
            {loading ? (
              <>
                <span className="loader" />
                Generating…
              </>
            ) : (
              'Generate Plan'
            )}
          </button>
        </div>
      </div>

      {/* ── Live Countdown & Stats ── */}
      {intervals && !intervals.isPast && date && subjects.length > 0 && (
        <div className="animate-slide-up grid gap-4 sm:grid-cols-3" id="planner-stats">
          {/* Days Remaining */}
          <div className="card text-center">
            <p className="text-3xl font-extrabold text-text-primary">{intervals.totalDays}</p>
            <p className="text-xs text-text-muted mt-1 uppercase tracking-widest">Days Left</p>
            <span className={`inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-[11px] font-semibold ${urgencyConfig[intervals.urgency].color}/15 ${urgencyConfig[intervals.urgency].textColor}`}>
              {urgencyConfig[intervals.urgency].emoji} {urgencyConfig[intervals.urgency].label}
            </span>
          </div>

          {/* Total Study Hours */}
          <div className="card text-center">
            <p className="text-3xl font-extrabold text-text-primary">{intervals.totalHours}</p>
            <p className="text-xs text-text-muted mt-1 uppercase tracking-widest">Total Hours</p>
            <p className="text-[11px] text-text-secondary mt-2">{intervals.hoursPerDay}h/day × {intervals.totalDays} days</p>
          </div>

          {/* Per Subject */}
          <div className="card text-center">
            <p className="text-3xl font-extrabold text-text-primary">{intervals.hoursPerSubject}</p>
            <p className="text-xs text-text-muted mt-1 uppercase tracking-widest">Hours / Subject</p>
            <p className="text-[11px] text-text-secondary mt-2">{intervals.totalHours}h ÷ {subjects.length} subjects</p>
          </div>
        </div>
      )}

      {/* ── Spaced Repetition Phases ── */}
      {intervals && !intervals.isPast && date && subjects.length > 0 && (
        <div className="card animate-slide-up" id="planner-phases" style={{ animationDelay: '100ms' }}>
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <span>⚡</span> Spaced-Repetition Phases
          </h3>

          {/* Phase bar */}
          <div className="flex rounded-lg overflow-hidden h-4 mb-4">
            <div
              className="bg-accent flex items-center justify-center text-[9px] text-white font-bold"
              style={{ width: `${(intervals.learnDays / intervals.totalDays) * 100}%` }}
              title={`Learn: ${intervals.learnDays} days`}
            />
            <div
              className="bg-warning flex items-center justify-center text-[9px] text-bg-primary font-bold"
              style={{ width: `${(intervals.reinforceDays / intervals.totalDays) * 100}%` }}
              title={`Reinforce: ${intervals.reinforceDays} days`}
            />
            <div
              className="bg-error flex items-center justify-center text-[9px] text-white font-bold"
              style={{ width: `${(intervals.testDays / intervals.totalDays) * 100}%` }}
              title={`Test: ${intervals.testDays} days`}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 w-3 h-3 rounded-sm bg-accent shrink-0" />
              <div>
                <p className="text-xs font-semibold text-text-primary">Phase 1 — Learn</p>
                <p className="text-[11px] text-text-muted">{intervals.learnDays} days · Read notes & practice</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 w-3 h-3 rounded-sm bg-warning shrink-0" />
              <div>
                <p className="text-xs font-semibold text-text-primary">Phase 2 — Reinforce</p>
                <p className="text-[11px] text-text-muted">{intervals.reinforceDays} days · Flashcards & drills</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 w-3 h-3 rounded-sm bg-error shrink-0" />
              <div>
                <p className="text-xs font-semibold text-text-primary">Phase 3 — Test</p>
                <p className="text-[11px] text-text-muted">{intervals.testDays} days · Mock exams & review</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Past Date Warning */}
      {intervals && intervals.isPast && (
        <div className="card border-error/50 animate-fade-in">
          <p className="text-sm text-error font-medium flex items-center gap-2">
            <span>⚠️</span> The selected date is in the past. Please choose a future date.
          </p>
        </div>
      )}

      {/* ── Generated Timetable ── */}
      {plan.length > 0 && (
        <div className="space-y-4 animate-fade-in" id="study-plan-output">
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success" />
            Your Study Timetable
          </h3>
          {plan.map((day, di) => (
            <div
              key={di}
              className="card animate-stagger-item"
              style={{ animationDelay: `${di * 80}ms` }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-bold text-accent-light">{day.day}</span>
                <span className="text-xs text-text-muted">— {day.date}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-text-muted border-b border-border">
                      <th className="pb-2 pr-4 font-semibold">Time</th>
                      <th className="pb-2 pr-4 font-semibold">Subject</th>
                      <th className="pb-2 font-semibold">Task</th>
                    </tr>
                  </thead>
                  <tbody>
                    {day.blocks.map((block, bi) => (
                      <tr
                        key={bi}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="py-2.5 pr-4 text-text-muted whitespace-nowrap">
                          {block.time}
                        </td>
                        <td className="py-2.5 pr-4 text-text-primary font-medium">
                          {block.subject}
                        </td>
                        <td className="py-2.5 text-text-secondary">{block.task}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
