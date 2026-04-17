-- ── SETTINGS ──────────────────────────────────────────────────
CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT INTO settings VALUES
    ('kcal_budget',    '1620'),
    ('water_target',   '2500'),
    ('start_weight',   '108.5'),
    ('start_date',     '2025-04-13');

-- ── DAYS ──────────────────────────────────────────────────────
CREATE TABLE days (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    date     TEXT    NOT NULL UNIQUE,  -- YYYY-MM-DD
    label    TEXT    NOT NULL,
    is_cheat INTEGER NOT NULL DEFAULT 0,
    budget   INTEGER NOT NULL DEFAULT 1620,
    notes    TEXT
);

-- ── MEALS ─────────────────────────────────────────────────────
CREATE TABLE meals (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    day_id INTEGER NOT NULL REFERENCES days(id) ON DELETE CASCADE,
    name   TEXT    NOT NULL,
    kcal   INTEGER NOT NULL DEFAULT 0,
    sort   INTEGER NOT NULL DEFAULT 0
);

-- ── MEAL ITEMS ────────────────────────────────────────────────
CREATE TABLE meal_items (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_id INTEGER NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    item    TEXT    NOT NULL,
    sort    INTEGER NOT NULL DEFAULT 0
);

-- ── DRINKS ────────────────────────────────────────────────────
CREATE TABLE drinks (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    day_id   INTEGER NOT NULL REFERENCES days(id) ON DELETE CASCADE,
    label    TEXT    NOT NULL,
    icon     TEXT,
    ml       INTEGER NOT NULL DEFAULT 0,
    kcal     INTEGER NOT NULL DEFAULT 0,
    when_tag TEXT,   -- 'morning', 'lunch', 'afternoon', 'dinner', 'evening_home', 'evening_out'
    sort     INTEGER NOT NULL DEFAULT 0
);

-- ── WEIGHT LOG ────────────────────────────────────────────────
CREATE TABLE weight_log (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    date  TEXT    NOT NULL UNIQUE,
    label TEXT    NOT NULL,
    kg    REAL    NOT NULL
);

-- ── MILESTONES ────────────────────────────────────────────────
CREATE TABLE milestones (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    label          TEXT NOT NULL,
    detail         TEXT,
    target_date    TEXT NOT NULL,
    target_weight  REAL NOT NULL,
    loss_target    TEXT,
    status         TEXT DEFAULT 'ok',  -- 'ok' | 'warning' | 'danger'
    tip            TEXT,
    color          TEXT DEFAULT '#6B1A2A'
);

-- ── INDEXES ───────────────────────────────────────────────────
CREATE INDEX idx_meals_day     ON meals(day_id);
CREATE INDEX idx_items_meal    ON meal_items(meal_id);
CREATE INDEX idx_drinks_day    ON drinks(day_id);
CREATE INDEX idx_days_date     ON days(date);
CREATE INDEX idx_weights_date  ON weight_log(date);

-- ── SEED DATA ─────────────────────────────────────────────────
INSERT INTO days (date, label, is_cheat, budget, notes) VALUES
('2025-04-13', 'Lunedì 13 Aprile',    0, 1620, 'Prima giornata. 1.625 kcal ✅ · Acqua 2.600ml ✅'),
('2025-04-14', 'Martedì 14 Aprile',   0, 1620, 'Colazione saltata. 1.660 kcal (+40) ⚠️ · Acqua 2.000ml ⚠️'),
('2025-04-15', 'Mercoledì 15 Aprile', 0, 1620, '1.274 kcal — 346 sotto budget ✅ · Acqua 3.225ml ✅'),
('2025-04-16', 'Giovedì 16 Aprile',   0, 1620, '1.452 kcal — 168 sotto budget ✅'),
('2025-04-17', 'Venerdì 17 Aprile',   0, 1620, 'In aggiornamento');

-- Meals: day 1 (13 Apr)
INSERT INTO meals (day_id, name, kcal, sort) VALUES
(1, 'Colazione',       320, 1),
(1, 'Spuntino mattina',150, 2),
(1, 'Pranzo',          520, 3),
(1, 'Spuntino ore 18',  80, 4),
(1, 'Cena',            555, 5);

-- Meals: day 2 (14 Apr)
INSERT INTO meals (day_id, name, kcal, sort) VALUES
(2, 'Colazione',   0,   1),
(2, 'Pranzo',      735, 2),
(2, 'Cena',        650, 3),
(2, 'Dopo cena',    80, 4),
(2, 'Birreria',    195, 5);

-- Meals: day 3 (15 Apr)
INSERT INTO meals (day_id, name, kcal, sort) VALUES
(3, 'Colazione', 249, 1),
(3, 'Pranzo',    430, 2),
(3, 'Cena',      475, 3),
(3, 'Pub',       120, 4);

-- Meals: day 4 (16 Apr)
INSERT INTO meals (day_id, name, kcal, sort) VALUES
(4, 'Colazione', 264, 1),
(4, 'Pranzo',    595, 2),
(4, 'Spuntino',  129, 3),
(4, 'Cena',      470, 4);

-- Meals: day 5 (17 Apr)
INSERT INTO meals (day_id, name, kcal, sort) VALUES
(5, 'Colazione', 290, 1),
(5, 'Pranzo',    490, 2);

-- Drinks: day 1
INSERT INTO drinks (day_id, label, icon, ml, kcal, when_tag) VALUES
(1, 'Bottiglia acqua',  '💧', 750,  0, 'morning'),
(1, 'Bicchierone pranzo','🥤',500,  0, 'lunch'),
(1, 'Bottiglia acqua',  '💧', 750,  0, 'afternoon'),
(1, '3 bicchieri sera', '🥛', 600,  0, 'evening_home');

-- Drinks: day 2
INSERT INTO drinks (day_id, label, icon, ml, kcal, when_tag) VALUES
(2, 'Bottiglia acqua',   '💧', 750,  0,   'morning'),
(2, 'Bicchierone pranzo','🥤', 500,  0,   'lunch'),
(2, 'Bottiglia acqua',   '💧', 750,  0,   'afternoon'),
(2, 'Birra bionda 5°',   '🍺', 450,  195, 'evening_out');

-- Drinks: day 3
INSERT INTO drinks (day_id, label, icon, ml, kcal, when_tag) VALUES
(3, 'Bicchiere acqua',   '🥤', 200,  0,   'morning'),
(3, 'Acqua mattina+pran','💧', 1500, 0,   'morning'),
(3, 'Bottiglia acqua',   '💧', 750,  0,   'afternoon'),
(3, 'Bottiglia acqua',   '💧', 375,  0,   'afternoon'),
(3, '2 bicchieri acqua', '🥤', 400,  0,   'dinner'),
(3, 'Birra scura 3°',    '🍺', 450,  120, 'evening_out');

-- Drinks: day 4
INSERT INTO drinks (day_id, label, icon, ml, kcal, when_tag) VALUES
(4, 'Bottiglia acqua',   '💧', 750,  0, 'morning'),
(4, 'Bicchierone pranzo','🥤', 500,  0, 'lunch'),
(4, 'Bottiglia acqua',   '🫙', 1000, 0, 'afternoon');

-- Drinks: day 5
INSERT INTO drinks (day_id, label, icon, ml, kcal, when_tag) VALUES
(5, 'Bottiglia acqua', '🫙', 1000, 0, 'morning');

-- Weight log
INSERT INTO weight_log (date, label, kg) VALUES
('2025-04-13', '13 Apr', 108.5),
('2025-04-17', '17 Apr', 107.8);

-- Milestones
INSERT INTO milestones (label, detail, target_date, target_weight, loss_target, status, tip, color) VALUES
('Matrimonio 1', 'Vestito taglia 54', '2025-06-12', 103.0, '~5.5 kg', 'ok',
 'Ultima settimana: zero sale, zero sgarri extra — solo il cheat del sabato.', '#6B1A2A'),
('Matrimonio 2', 'Vestito taglia 52 stretta', '2025-07-17', 100.5, '~8 kg', 'warning',
 'Salta il cheat day il sabato 12 luglio per arrivare sgonfio.', '#B8963E');

-- ── USEFUL VIEWS ──────────────────────────────────────────────
CREATE VIEW v_day_summary AS
SELECT
    d.id,
    d.date,
    d.label,
    d.is_cheat,
    d.budget,
    COALESCE(SUM(m.kcal), 0)                                          AS total_kcal,
    d.budget - COALESCE(SUM(m.kcal), 0)                               AS remaining_kcal,
    COALESCE(SUM(CASE WHEN dr.kcal = 0 THEN dr.ml ELSE 0 END), 0)    AS water_ml,
    COALESCE(SUM(CASE WHEN dr.kcal > 0 THEN dr.kcal ELSE 0 END), 0)  AS alcohol_kcal,
    d.notes
FROM days d
LEFT JOIN meals  m  ON m.day_id  = d.id
LEFT JOIN drinks dr ON dr.day_id = d.id
GROUP BY d.id;
