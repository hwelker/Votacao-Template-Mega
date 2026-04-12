const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// ============================================================
//  CONFIGURACAO - Edite aqui os templates quando tiver os links
// ============================================================
const CONFIG = {
  title: 'Votacao de Templates',
  subtitle: 'Escolha o melhor template de Pagina feito com IA',
  templates: [
    { id: 'template-1', name: 'Template A', url: 'https://advogado-tributario.vercel.app/', designer: 'Felipe Cavalcanti' },
    { id: 'template-2', name: 'Template B', url: 'https://mega-ads.vercel.app/', designer: 'Felipe Nascimento' },
    { id: 'template-3', name: 'Template C', url: 'https://todescatto-advocacia.vercel.app/', designer: 'Stanley' },
  ],
  allowedDomain: '',
};

// Caminho do arquivo de votos
const VOTES_FILE = path.join(__dirname, 'data', 'votes.json');

function ensureVotesFile() {
  const dir = path.dirname(VOTES_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(VOTES_FILE)) {
    fs.writeFileSync(VOTES_FILE, JSON.stringify({ votes: {} }, null, 2));
  }
}

function readVotes() {
  ensureVotesFile();
  return JSON.parse(fs.readFileSync(VOTES_FILE, 'utf-8'));
}

function writeVotes(data) {
  fs.writeFileSync(VOTES_FILE, JSON.stringify(data, null, 2));
}

function getResults() {
  const data = readVotes();
  const counts = {};
  CONFIG.templates.forEach(t => { counts[t.id] = 0; });
  Object.values(data.votes).forEach(templateId => {
    if (counts[templateId] !== undefined) counts[templateId]++;
  });
  const total = Object.values(counts).reduce((s, c) => s + c, 0);
  return { counts, total };
}

// Middleware
app.use(express.json());

// Serve arquivos estaticos da raiz (index.html, logo, etc.)
app.use(express.static(__dirname, {
  index: 'index.html',
  dotfiles: 'deny',
  extensions: ['html'],
}));

// API: Configuracao
app.get('/api/config', (_req, res) => res.json(CONFIG));

// API: Votar
app.post('/api/vote', (req, res) => {
  const { email, template } = req.body;
  if (!email || !template) {
    return res.status(400).json({ error: 'Email e template sao obrigatorios.' });
  }
  const emailLower = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
    return res.status(400).json({ error: 'Email invalido.' });
  }
  if (CONFIG.allowedDomain && !emailLower.endsWith('@' + CONFIG.allowedDomain)) {
    return res.status(403).json({ error: `Apenas emails @${CONFIG.allowedDomain} podem votar.` });
  }
  const validIds = CONFIG.templates.map(t => t.id);
  if (!validIds.includes(template)) {
    return res.status(400).json({ error: 'Template invalido.' });
  }
  const data = readVotes();
  data.votes[emailLower] = template;
  writeVotes(data);
  const { counts, total } = getResults();
  res.json({ success: true, counts, total, voted: template });
});

// API: Resultados
app.get('/api/results', (_req, res) => {
  const { counts, total } = getResults();
  res.json({ counts, total });
});

// API: Checar se email ja votou
app.get('/api/check/:email', (req, res) => {
  const emailLower = req.params.email.toLowerCase().trim();
  const data = readVotes();
  const voted = data.votes[emailLower] || null;
  const { counts, total } = getResults();
  res.json({ voted, counts, total });
});

// Local dev
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n  Painel de Votacao Mega`);
    console.log(`  http://localhost:${PORT}\n`);
  });
}

// Vercel serverless
module.exports = app;
