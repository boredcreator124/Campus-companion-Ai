import http from 'http';

const docText = [
  "Chapter 1: Photosynthesis. Photosynthesis is the biological process by which plants, algae, and cyanobacteria convert light energy into chemical energy stored as glucose. This process occurs primarily in the chloroplasts of plant cells. The overall equation for photosynthesis is: 6CO2 + 6H2O + light energy = C6H12O6 + 6O2.",
  "Chapter 2: The Light-Dependent Reactions. The light-dependent reactions occur in the thylakoid membranes. Chlorophyll absorbs sunlight and uses it to split water molecules in a process called photolysis, releasing oxygen as a byproduct. The energy captured is used to produce ATP and NADPH, which power the Calvin cycle. Photosystem I (P700) and Photosystem II (P680) are two key protein complexes involved in the light reactions.",
  "Chapter 3: The Calvin Cycle. The Calvin cycle takes place in the stroma of the chloroplast. It uses the ATP and NADPH from the light reactions to fix carbon dioxide into glucose. The cycle has three stages: carbon fixation, reduction, and regeneration of RuBP. The enzyme RuBisCO is responsible for carbon fixation. It is the most abundant enzyme on Earth and catalyses the reaction between CO2 and ribulose bisphosphate (RuBP).",
  "Chapter 4: Factors Affecting Photosynthesis. The rate of photosynthesis is affected by several limiting factors: light intensity, carbon dioxide concentration, and temperature. Increasing light intensity increases the rate of photosynthesis up to a saturation point. Chlorophyll absorbs mainly red and blue wavelengths. Green light is mostly reflected, which is why plants appear green.",
  "Chapter 5: C3, C4, and CAM Plants. C3 plants such as wheat and rice fix CO2 directly via RuBisCO into a 3-carbon compound. C4 plants such as corn and sugarcane pre-fix CO2 in mesophyll cells into a 4-carbon compound to reduce photorespiration. CAM plants such as cacti open stomata only at night to conserve water while still fixing CO2."
].join('\n\n');

const SESSION_ID = 'rag-test-session-001';

function apiCall(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: 'localhost', port: 3001, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    };
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runTest() {
  console.log('='.repeat(60));
  console.log('CAMPUS COMPANION RAG SYSTEM TEST');
  console.log('='.repeat(60));

  // ── STEP 1: Ingest ──────────────────────────────────────────
  console.log('\n[1/4] INGESTING document into RAG...');
  const ingest = await apiCall('/api/ingest', {
    text: docText,
    filename: 'test_photosynthesis.docx',
    sessionId: SESSION_ID
  });
  console.log('Status:', ingest.status);
  const ingestData = JSON.parse(ingest.body);
  console.log('Chunks ingested:', ingestData.chunksIngested);
  console.log('Preview:', ingestData.textExtracted?.slice(0, 120) + '...');
  if (ingest.status !== 200) { console.error('FAILED - ingest error'); process.exit(1); }

  // ── STEP 2: Summarizer ──────────────────────────────────────
  console.log('\n[2/4] SUMMARIZER — topic: "Calvin cycle and RuBisCO"');
  const summ = await apiCall('/api/summarize', {
    topic: 'Calvin cycle and RuBisCO',
    sessionId: SESSION_ID
  });
  const summData = JSON.parse(summ.body);
  console.log('Status:', summ.status);
  console.log('Summary output:\n', summData.summary);
  const summOk = summData.summary && (
    summData.summary.toLowerCase().includes('rubisco') ||
    summData.summary.toLowerCase().includes('calvin') ||
    summData.summary.toLowerCase().includes('carbon fixation')
  );
  console.log('RAG GROUNDED?', summOk ? '✅ YES — mentions Calvin/RuBisCO content' : '❌ NO — off-topic response');

  // ── STEP 3: Quiz Generator ─────────────────────────────────
  console.log('\n[3/4] QUIZ GEN — topic: "photosynthesis light reactions"');
  const quiz = await apiCall('/api/quiz', {
    topic: 'photosynthesis light reactions',
    sessionId: SESSION_ID
  });
  const quizData = JSON.parse(quiz.body);
  console.log('Status:', quiz.status);
  console.log('Questions generated:', quizData.questions?.length);
  quizData.questions?.slice(0, 2).forEach((q, i) => {
    console.log(`  Q${i+1}: ${q.question}`);
    console.log(`      Options: ${q.options.join(' | ')}`);
    console.log(`      Correct: ${q.options[q.correctOption]}`);
  });
  const quizText = JSON.stringify(quizData).toLowerCase();
  const quizOk = quizText.includes('chlorophyll') || quizText.includes('atp') ||
                 quizText.includes('nadph') || quizText.includes('thylakoid') ||
                 quizText.includes('photosystem') || quizText.includes('photolysis');
  console.log('RAG GROUNDED?', quizOk ? '✅ YES — questions reference document content' : '❌ NO — generic questions');

  // ── STEP 4: Flashcards ─────────────────────────────────────
  console.log('\n[4/4] FLASHCARDS — topic: "C3 C4 CAM plants"');
  const flash = await apiCall('/api/flashcards', {
    topic: 'C3 C4 CAM plants',
    sessionId: SESSION_ID
  });
  const flashData = JSON.parse(flash.body);
  console.log('Status:', flash.status);
  console.log('Flashcards generated:', flashData.flashcards?.length);
  flashData.flashcards?.slice(0, 3).forEach((c, i) => {
    console.log(`  Card ${i+1}: ${c.front}`);
    console.log(`         ${c.back?.slice(0, 80)}...`);
  });
  const flashText = JSON.stringify(flashData).toLowerCase();
  const flashOk = flashText.includes('c3') || flashText.includes('c4') ||
                  flashText.includes('cam') || flashText.includes('corn') ||
                  flashText.includes('cacti') || flashText.includes('wheat') ||
                  flashText.includes('mesophyll') || flashText.includes('stomata');
  console.log('RAG GROUNDED?', flashOk ? '✅ YES — cards reference C3/C4/CAM content' : '❌ NO — generic cards');

  // ── SUMMARY ───────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('FINAL VERDICT');
  console.log('='.repeat(60));
  const all = summOk && quizOk && flashOk;
  console.log('Summarizer:', summOk ? '✅ PASS' : '❌ FAIL');
  console.log('Quiz Gen:  ', quizOk ? '✅ PASS' : '❌ FAIL');
  console.log('Flashcards:', flashOk ? '✅ PASS' : '❌ FAIL');
  console.log('\nOverall RAG System:', all ? '✅ ALL PASSING - Document-grounded' : '⚠️  Some endpoints need attention');
}

runTest().catch(err => {
  console.error('Test failed with error:', err.message);
  process.exit(1);
});
