/**
 * Mock AI Service
 * Replace these functions with real API calls later.
 */

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Summarize text into bullet points.
 * @param {string} text
 * @returns {Promise<string[]>}
 */
export async function summarizeText(text) {
  try {
    const sessionId = sessionStorage.getItem('campus_session_id') || 'unknown';
    const res = await fetch('http://localhost:3001/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: text, sessionId })
    });
    if (res.ok) {
      const data = await res.json();
      return data.summary.split('\n').filter(line => line.trim().length > 0);
    }
  } catch (err) {
    console.warn("Backend unavailable, falling back to mock summarize");
  }

  await delay(1200);
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  if (sentences.length === 0) {
    return [
      'The input discusses key concepts relevant to the subject matter.',
      'Core principles are highlighted alongside practical applications.',
      'Further study is recommended for deeper understanding.',
    ];
  }

  return sentences.slice(0, 5).map((s) => {
    const words = s.split(' ');
    return words.length > 12
      ? words.slice(0, 12).join(' ') + '…'
      : s;
  });
}

/**
 * Generate a 5-question quiz from text.
 * @param {string} text
 * @returns {Promise<Array<{id:number, type:string, question:string, options:string[], answer:string}>>}
 */
export async function generateQuiz(text) {
  try {
    const sessionId = sessionStorage.getItem('campus_session_id') || 'unknown';
    const res = await fetch('http://localhost:3001/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: text || "Key material concepts", sessionId }) 
    });
    if (res.ok) {
      const data = await res.json();
      // map backend structure to frontend structure
      return data.questions.map((q, i) => ({
        id: i + 1,
        type: 'mcq',
        question: q.question,
        options: q.options,
        answer: q.options[q.correctOption]
      }));
    }
  } catch (err) {
    console.warn("Backend unavailable, falling back to mock quiz");
  }

  await delay(1500);
  return [
    {
      id: 1,
      type: 'mcq',
      question: 'What is the primary topic of the provided text?',
      options: ['Data structures', 'Algorithms', 'Machine learning', 'Networking'],
      answer: 'Machine learning',
    },
    {
      id: 2,
      type: 'tf',
      question: 'The text mentions supervised learning as a key concept.',
      options: ['True', 'False'],
      answer: 'True',
    },
    {
      id: 3,
      type: 'mcq',
      question: 'Which technique is highlighted for classification tasks?',
      options: ['Linear regression', 'Decision trees', 'K-means clustering', 'PCA'],
      answer: 'Decision trees',
    },
    {
      id: 4,
      type: 'tf',
      question: 'Unsupervised learning requires labeled data.',
      options: ['True', 'False'],
      answer: 'False',
    },
    {
      id: 5,
      type: 'mcq',
      question: 'What metric is commonly used to evaluate classifiers?',
      options: ['RMSE', 'Accuracy', 'R-squared', 'Silhouette score'],
      answer: 'Accuracy',
    },
  ];
}

/**
 * Generate 3D Flashcards based on context
 * @param {string} text - The input text
 * @returns {Promise<Array<{front:string,back:string}>>}
 */
export async function generateFlashcards(text) {
  try {
    const sessionId = sessionStorage.getItem('campus_session_id') || 'unknown';
    const res = await fetch('http://localhost:3001/api/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: text || "key vocabulary and definitions", sessionId }) 
    });
    if (res.ok) {
      const data = await res.json();
      return data.flashcards;
    }
  } catch (err) {
    console.warn("Backend unavailable, falling back to mock flashcards");
  }

  await delay(1200);
  return [
    { front: "Mitochondria", back: "The powerhouse of the cell, responsible for energy production." },
    { front: "Photosynthesis", back: "The process by which green plants and some other organisms use sunlight to synthesize nutrients from carbon dioxide and water." }
  ];
}

/**
 * Generate a study plan timetable.
 * @param {Date} targetDate
 * @param {string[]} subjects
 * @returns {Promise<Array<{day:string, date:string, blocks:Array<{time:string,subject:string,task:string}>}>>}
 */
export async function generateStudyPlan(targetDate, subjects) {
  try {
    const sessionId = sessionStorage.getItem('campus_session_id') || 'unknown';
    const res = await fetch('http://localhost:3001/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetDate, subjects, sessionId })
    });
    if (res.ok) {
      const data = await res.json();
      return data.plan;
    }
  } catch (err) {
    console.warn("Backend unavailable, falling back to mock study plan");
  }

  await delay(1000);

  const plan = [];
  const start = new Date();
  const end = new Date(targetDate);
  const totalDays = Math.max(
    1,
    Math.ceil((end - start) / (1000 * 60 * 60 * 24))
  );
  const dayCount = Math.min(totalDays, 7);
  const timeSlots = ['09:00 – 10:30', '11:00 – 12:30', '14:00 – 15:30', '16:00 – 17:30'];
  const tasks = ['Read chapter notes', 'Practice problems', 'Review flashcards', 'Watch lecture recap'];

  for (let d = 0; d < dayCount; d++) {
    const dayDate = new Date(start);
    dayDate.setDate(dayDate.getDate() + d);
    const blocks = timeSlots.map((time, i) => ({
      time,
      subject: subjects[i % subjects.length],
      task: tasks[i % tasks.length],
    }));
    plan.push({
      day: dayDate.toLocaleDateString('en-US', { weekday: 'long' }),
      date: dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      blocks,
    });
  }

  return plan;
}

/**
 * Chat tutor response.
 * @param {string} message
 * @param {Array<{role:string,content:string}>} history
 * @returns {Promise<string>}
 */
export async function chatResponse(message, history, onChunk) {
  try {
    const sessionId = sessionStorage.getItem('campus_session_id') || 'unknown';
    const res = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, sessionId })
    });

    if (res.ok) {
      if (!onChunk) {
        // Fallback if caller doesn't want streaming (though we only send SSE now)
        return "Streaming requires onChunk callback.";
      }
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let fullText = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunkValue = decoder.decode(value, { stream: true });
          const events = chunkValue.split('\n\n');
          for (const ev of events) {
            if (ev.startsWith('data: ')) {
              const dataStr = ev.substring(6);
              if (dataStr === '[DONE]') {
                done = true;
                break;
              }
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.text) {
                  fullText += parsed.text;
                  onChunk(fullText);
                }
              } catch (e) {}
            }
          }
        }
      }
      return fullText;
    }
  } catch (err) {
    console.warn("Backend unavailable, falling back to mock chat");
  }

  await delay(800);

  const responses = [
    "Great question! Let me break that down for you. The key idea here is to focus on understanding the core concept before moving to applications.",
    "That's an interesting point. In academic contexts, this topic is often approached by first establishing fundamentals, then exploring case studies.",
    "I'd recommend starting with the basics. Make sure you understand the prerequisites, then work through practice problems methodically.",
    "Think of it this way — the concept works like a building block. Each layer depends on the one below it, so mastering foundations is essential.",
    "Let me clarify that. The distinction is subtle but important: the first approach is theoretical, while the second focuses on practical implementation.",
  ];

  const fullMockText = responses[Math.floor(Math.random() * responses.length)];
  if (onChunk) {
      // Mock streaming effect
      let currentMockStr = "";
      const words = fullMockText.split(" ");
      for (const word of words) {
          currentMockStr += word + " ";
          onChunk(currentMockStr);
          await delay(50);
      }
  }

  return fullMockText;
}
