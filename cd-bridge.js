/* ═══════════════════════════════════════════════════════
   CREATIVE DISASTER — Bridge Server
   Connects the web interfaces to Ollama (local AI)
   and logs all interactions to the archive.

   Run: node cd-bridge.js
   Port: 3334
   ═══════════════════════════════════════════════════════ */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3334;
const OLLAMA_HOST = 'http://localhost:11434';
const ARCHIVE_PATH = path.join(__dirname, 'archivio.json');

// Initialize archive if it doesn't exist
if (!fs.existsSync(ARCHIVE_PATH)) {
  fs.writeFileSync(ARCHIVE_PATH, JSON.stringify({
    studio: 'Creative Disaster',
    created: new Date().toISOString(),
    entries: []
  }, null, 2));
}

function readArchive() {
  return JSON.parse(fs.readFileSync(ARCHIVE_PATH, 'utf8'));
}

function writeArchive(archive) {
  fs.writeFileSync(ARCHIVE_PATH, JSON.stringify(archive, null, 2));
}

function logToArchive(entry) {
  const archive = readArchive();
  archive.entries.push({
    id: Date.now(),
    timestamp: new Date().toISOString(),
    ...entry
  });
  writeArchive(archive);
}

// Proxy request to Ollama
function ollamaRequest(endpoint, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, OLLAMA_HOST);
    const data = JSON.stringify(body);

    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, res => {
      let chunks = '';
      res.on('data', d => chunks += d);
      res.on('end', () => {
        try { resolve(JSON.parse(chunks)); }
        catch { resolve({ response: chunks }); }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);

  await new Promise(resolve => req.on('end', resolve));

  // === ROUTES ===

  // POST /ask — Send a prompt to bif-studio model
  if (req.url === '/ask' && req.method === 'POST') {
    try {
      const { prompt, agent, context } = JSON.parse(body);
      const model = 'bif-studio';

      const result = await ollamaRequest('/api/generate', {
        model,
        prompt: agent ? `[Agente: ${agent}] ${prompt}` : prompt,
        stream: false,
        options: { num_ctx: 4096 }
      });

      // Log to archive
      logToArchive({
        type: 'conversation',
        agent: agent || 'bif-studio',
        prompt,
        response: result.response,
        model,
        context: context || null
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        response: result.response,
        agent: agent || 'bif-studio',
        archived: true
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /log — Log an external AI interaction (Gemini, ChatGPT, etc.)
  if (req.url === '/log' && req.method === 'POST') {
    try {
      const entry = JSON.parse(body);
      logToArchive({
        type: 'external',
        ...entry
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ logged: true }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /archive — Get all archived entries
  if (req.url === '/archive' && req.method === 'GET') {
    try {
      const archive = readArchive();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(archive));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /archive/stats — Get archive statistics
  if (req.url === '/archive/stats' && req.method === 'GET') {
    try {
      const archive = readArchive();
      const entries = archive.entries;
      const stats = {
        total: entries.length,
        byAgent: {},
        byType: {},
        today: entries.filter(e => e.timestamp?.startsWith(new Date().toISOString().slice(0, 10))).length,
        lastEntry: entries[entries.length - 1] || null
      };
      entries.forEach(e => {
        stats.byAgent[e.agent || 'unknown'] = (stats.byAgent[e.agent || 'unknown'] || 0) + 1;
        stats.byType[e.type || 'unknown'] = (stats.byType[e.type || 'unknown'] || 0) + 1;
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(stats));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /models — List available Ollama models
  if (req.url === '/models' && req.method === 'GET') {
    try {
      const result = await new Promise((resolve, reject) => {
        http.get(`${OLLAMA_HOST}/api/tags`, r => {
          let d = '';
          r.on('data', c => d += c);
          r.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({}); } });
        }).on('error', reject);
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /health — Check if bridge and Ollama are alive
  if (req.url === '/health' && req.method === 'GET') {
    let ollamaAlive = false;
    try {
      await new Promise((resolve, reject) => {
        http.get(`${OLLAMA_HOST}/api/tags`, r => {
          ollamaAlive = r.statusCode === 200;
          r.resume();
          r.on('end', resolve);
        }).on('error', reject);
      });
    } catch {}

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      bridge: true,
      ollama: ollamaAlive,
      model: 'bif-studio',
      studio: 'Creative Disaster',
      anno: 'I'
    }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n  ═══════════════════════════════════════`);
  console.log(`  CREATIVE DISASTER — Bridge Server`);
  console.log(`  Port: ${PORT}`);
  console.log(`  Ollama: ${OLLAMA_HOST}`);
  console.log(`  Model: bif-studio`);
  console.log(`  Archive: ${ARCHIVE_PATH}`);
  console.log(`  ═══════════════════════════════════════\n`);
});
