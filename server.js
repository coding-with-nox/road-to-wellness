const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const db = new Database('roadtowellness.db');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS days (
    date TEXT PRIMARY KEY,
    meals_json TEXT NOT NULL,
    drinks_json TEXT NOT NULL,
    cheat_day INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS weights (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    kg REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS milestones (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    target_weight REAL NOT NULL,
    description TEXT NOT NULL DEFAULT ''
  );
`);

const defaultSettings = {
  kcalBudget: 1620,
  waterTarget: 2500,
  startWeight: 82,
  startDate: new Date().toISOString().slice(0, 10),
  hydrationPattern: 'Balanced',
};

function readState() {
  const settingsRow = db.prepare('SELECT data FROM settings WHERE id = 1').get();
  const settings = settingsRow ? JSON.parse(settingsRow.data) : defaultSettings;

  const dayRows = db.prepare('SELECT * FROM days').all();
  const days = {};
  dayRows.forEach((row) => {
    days[row.date] = {
      meals: JSON.parse(row.meals_json || '[]'),
      drinks: JSON.parse(row.drinks_json || '[]'),
      cheatDay: Boolean(row.cheat_day),
      notes: row.notes || '',
    };
  });

  const weights = db.prepare('SELECT * FROM weights ORDER BY date ASC').all();
  const milestones = db.prepare('SELECT id, name, date, target_weight AS targetWeight, description FROM milestones ORDER BY date ASC').all();

  return { settings, days, weights, milestones };
}

const replaceState = db.transaction((incoming) => {
  db.prepare('INSERT OR REPLACE INTO settings (id, data) VALUES (1, ?)').run(JSON.stringify(incoming.settings || defaultSettings));

  db.prepare('DELETE FROM days').run();
  db.prepare('DELETE FROM weights').run();
  db.prepare('DELETE FROM milestones').run();

  const insertDay = db.prepare(`
    INSERT INTO days (date, meals_json, drinks_json, cheat_day, notes)
    VALUES (?, ?, ?, ?, ?)
  `);

  Object.entries(incoming.days || {}).forEach(([date, day]) => {
    insertDay.run(
      date,
      JSON.stringify(day.meals || []),
      JSON.stringify(day.drinks || []),
      day.cheatDay ? 1 : 0,
      day.notes || ''
    );
  });

  const insertWeight = db.prepare('INSERT INTO weights (id, date, kg) VALUES (?, ?, ?)');
  (incoming.weights || []).forEach((w) => {
    insertWeight.run(w.id, w.date, Number(w.kg));
  });

  const insertMilestone = db.prepare('INSERT INTO milestones (id, name, date, target_weight, description) VALUES (?, ?, ?, ?, ?)');
  (incoming.milestones || []).forEach((m) => {
    insertMilestone.run(m.id, m.name, m.date, Number(m.targetWeight), m.description || '');
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/state', (_req, res) => {
  res.json(readState());
});

app.put('/api/state', (req, res) => {
  const incoming = req.body || {};
  replaceState(incoming);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`RoadToWellness backend listening on http://localhost:${PORT}`);
});
