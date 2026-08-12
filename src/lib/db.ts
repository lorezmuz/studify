import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

export type {
  PianoRow,
  FlashcardRow,
  QuizRow,
  QuizDomanda,
} from "./piano-types";

const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "studify.sqlite");

// migrazione nome file legacy
function legacyDbPath() {
  return path.join(dataDir, "volentieri.sqlite");
}

let _db: Database.Database | null = null;

export function getDb() {
  if (_db) return _db;
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  // rinomina DB legacy se presente
  const legacy = legacyDbPath();
  if (!fs.existsSync(dbPath) && fs.existsSync(legacy)) {
    try {
      fs.renameSync(legacy, dbPath);
      for (const s of ["-wal", "-shm"]) {
        if (fs.existsSync(legacy + s)) fs.renameSync(legacy + s, dbPath + s);
      }
    } catch {
      /* usa path nuovo vuoto se rename fallisce */
    }
  }
  _db = new Database(dbPath);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  migrate(_db);
  return _db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS piani (
      id TEXT PRIMARY KEY,
      materia TEXT NOT NULL,
      argomenti TEXT NOT NULL,
      data_esame TEXT,
      voto_obiettivo INTEGER,
      riassunto TEXT,
      ai_provider TEXT DEFAULT 'claude',
      stato TEXT DEFAULT 'generando',
      errore TEXT,
      roadmap_json TEXT,
      progress_json TEXT,
      creato_il TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS flashcard (
      id TEXT PRIMARY KEY,
      piano_id TEXT NOT NULL REFERENCES piani(id) ON DELETE CASCADE,
      fronte TEXT NOT NULL,
      retro TEXT NOT NULL,
      prossima_revisione TEXT DEFAULT (date('now')),
      livello INTEGER DEFAULT 0,
      intervallo_giorni INTEGER DEFAULT 1,
      fattore_facilita REAL DEFAULT 2.5
    );

    CREATE TABLE IF NOT EXISTS quiz (
      id TEXT PRIMARY KEY,
      piano_id TEXT NOT NULL REFERENCES piani(id) ON DELETE CASCADE,
      numero INTEGER DEFAULT 1,
      domande_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quiz_risultati (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL REFERENCES quiz(id) ON DELETE CASCADE,
      punteggio INTEGER,
      risposte_date_json TEXT,
      feedback_ai TEXT,
      completato_il TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS preferenze_materia (
      materia TEXT PRIMARY KEY,
      provider_preferito TEXT,
      note TEXT
    );
  `);

  // colonne aggiunte in seguito (SQLite non ha IF NOT EXISTS su ADD COLUMN ovunque)
  const cols = db.prepare(`PRAGMA table_info(piani)`).all() as { name: string }[];
  const names = new Set(cols.map((c) => c.name));
  if (!names.has("roadmap_json")) {
    db.exec(`ALTER TABLE piani ADD COLUMN roadmap_json TEXT`);
  }
  if (!names.has("progress_json")) {
    db.exec(`ALTER TABLE piani ADD COLUMN progress_json TEXT`);
  }
}

