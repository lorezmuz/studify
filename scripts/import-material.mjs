import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { nanoid } from "nanoid";

const pianoId = process.argv[2] || "T1N2P3UlJQ";
const jsonPath =
  process.argv[3] ||
  path.join("data", "uploads", pianoId, "studio_statica_fluidi.json");

const raw = fs.readFileSync(jsonPath, "utf8");
const material = JSON.parse(raw);

if (!material.riassunto || !material.flashcard?.length || !material.quiz?.length) {
  console.error("JSON incompleto");
  process.exit(1);
}

const db = new Database("data/volentieri.sqlite");
db.pragma("foreign_keys = ON");

const piano = db.prepare("SELECT id FROM piani WHERE id = ?").get(pianoId);
if (!piano) {
  console.error("Piano non trovato:", pianoId);
  process.exit(1);
}

const insertCard = db.prepare(
  `INSERT INTO flashcard (id, piano_id, fronte, retro) VALUES (?, ?, ?, ?)`
);
const insertQuiz = db.prepare(
  `INSERT INTO quiz (id, piano_id, numero, domande_json) VALUES (?, ?, 1, ?)`
);

const tx = db.transaction(() => {
  db.prepare(
    `UPDATE piani SET riassunto = ?, stato = 'pronto', errore = NULL, ai_provider = 'grok' WHERE id = ?`
  ).run(material.riassunto, pianoId);

  db.prepare(`DELETE FROM flashcard WHERE piano_id = ?`).run(pianoId);
  db.prepare(
    `DELETE FROM quiz_risultati WHERE quiz_id IN (SELECT id FROM quiz WHERE piano_id = ?)`
  ).run(pianoId);
  db.prepare(`DELETE FROM quiz WHERE piano_id = ?`).run(pianoId);

  for (const c of material.flashcard) {
    insertCard.run(nanoid(12), pianoId, c.fronte, c.retro);
  }
  insertQuiz.run(nanoid(12), pianoId, JSON.stringify(material.quiz));
});

tx();

console.log("OK piano", pianoId);
console.log("riassunto chars", material.riassunto.length);
console.log("flashcard", material.flashcard.length);
console.log("quiz", material.quiz.length);
console.log("Apri http://localhost:3005/piani/" + pianoId);
