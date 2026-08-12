import Database from "better-sqlite3";

const db = new Database("data/volentieri.sqlite");

// Primo tentativo: upload fallito (max 12), rimasto "generando" senza riassunto
const r = db
  .prepare(
    `UPDATE piani
     SET stato = 'errore',
         errore = 'Upload fallito (limite 12 foto, poi alzato a 20). Piano orfano: non ha mai generato. Usa quello successivo o creane uno nuovo.'
     WHERE id = 'kYvYpRDW9c' AND stato = 'generando' AND (riassunto IS NULL OR riassunto = '')`
  )
  .run();

console.log("updated orphan", r.changes);
console.log(
  JSON.stringify(
    db
      .prepare(
        `SELECT id, stato, substr(coalesce(errore,''),1,80) as err FROM piani ORDER BY creato_il DESC`
      )
      .all(),
    null,
    2
  )
);
