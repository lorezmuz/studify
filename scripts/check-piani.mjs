import Database from "better-sqlite3";

const db = new Database("data/volentieri.sqlite");
const rows = db
  .prepare(
    `SELECT id, materia, argomenti, stato, ai_provider, errore, creato_il,
            length(coalesce(riassunto, '')) as riass_len
     FROM piani ORDER BY creato_il DESC LIMIT 10`
  )
  .all();
console.log(JSON.stringify(rows, null, 2));
console.log(
  "flashcard",
  db.prepare("SELECT count(*) as c FROM flashcard").get()
);
console.log("quiz", db.prepare("SELECT count(*) as c FROM quiz").get());
