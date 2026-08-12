import type { GenerateRequest, LearningPack, Subject } from "./types";
import { uid } from "./utils";

function base(
  input: GenerateRequest,
  partial: Omit<
    LearningPack,
    "id" | "createdAt" | "sourcePreview" | "subject" | "level"
  > & { subject?: Subject }
): LearningPack {
  return {
    id: uid("pack"),
    subject: partial.subject || input.subject || "altro",
    level: input.level || "media",
    sourcePreview: (input.bookText || input.topic).slice(0, 280),
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

/** Contenuto offline USABILE (non filler) quando l'AI non risponde. */
export function buildOfflinePack(input: GenerateRequest): LearningPack {
  const topic = input.topic.trim() || "Argomento";
  const book = input.bookText?.trim() || "";
  const lower = `${topic} ${book} ${input.subject || ""}`.toLowerCase();

  if (
    lower.includes("latin") ||
    lower.includes("declinaz") ||
    lower.includes("coniugaz") ||
    lower.includes("ablativo") ||
    lower.includes("accusativo")
  ) {
    return latinStarter(input, topic);
  }

  if (book.length > 80) {
    return fromBookText(input, topic, book);
  }

  return honestFallback(input, topic);
}

function latinStarter(input: GenerateRequest, topic: string): LearningPack {
  const tooBroad =
    /tutti|intero|programma|prima e seconda|1\s*e\s*2|tutto il/i.test(topic);

  return base(input, {
    subject: "italiano",
    title: tooBroad
      ? "Latino: mappa del programma (1° e 2° superiore) + prima lezione"
      : topic,
    hook: tooBroad
      ? "Non si impara 'tutto il latino' in un colpo. Partiamo dalla mappa e dalla 1ª declinazione: è la base di quasi tutte le versioni."
      : `Percorso concreto su: ${topic}`,
    summary: tooBroad
      ? "Questo percorso fa due cose: (1) ti mostra come è organizzato il latino di 1°/2° superiore, (2) ti fa studiare subito la 1ª declinazione con esempi, quiz e pratica. Poi crei un percorso nuovo per ogni blocco (2ª declinazione, perfetto, proposizioni...)."
      : `Lezione operativa su "${topic}" con esempi latini, non discorsi generici sullo studio.`,
    keyPoints: [
      "Il latino è soprattutto MORFOLOGIA + SINTASSI, non frasi a memoria",
      "1ª declinazione: tema in -a (rosa, ae f.)",
      "Casi: Nominativo (soggetto), Genitivo (di), Dativo (a/per), Accusativo (oggetto), Vocativo (chiami), Ablativo (con/da/in/per)",
      "Trucco: impara SEMPRE nominativo + genitivo + genere (rosa, -ae, f.)",
      tooBroad
        ? "Prossimo passo dopo questo pack: 2ª declinazione (lupus, -i m.)"
        : "Fai il quiz: se sbagli i casi, ripeti la tabella ad alta voce",
    ],
    analogy:
      "I casi sono come i ruoli in una frase italiana: chi fa l'azione (Nom.), chi la subisce (Acc.), di chi è qualcosa (Gen.). In latino il ruolo lo dice la DESINENZA, non l'ordine delle parole.",
    lessonSections: [
      {
        title: tooBroad ? "Mappa del programma (1° e 2°)" : "Cosa stai studiando",
        body: tooBroad
          ? `Blocchi tipici in 1°/2° superiore:
1) 1ª e 2ª declinazione + aggettivi della 1ª classe
2) 3ª declinazione (più tosta)
3) 4ª e 5ª declinazione
4) Verbi: presente, imperfetto, futuro; poi perfetto, piuccheperfetto, futuro anteriore
5) Pronomi (is ea id, qui quae quod, hic haec hoc...)
6) Sintassi base: complementi, proposizioni infinite, cum + congiuntivo, ut/ne
Non fare tutto oggi. Scegli UN blocco alla volta e crea un percorso Volentieri solo su quello.`
          : `Focus: ${topic}. Collega sempre: forma (desinenza) → funzione (ruolo nella frase) → traduzione.`,
      },
      {
        title: "1ª declinazione (rosa, -ae, f.)",
        body: `Tema in -a. Quasi tutte femminili (eccezioni maschili: poeta, agricola, nauta...).

Singolare:
• Nom. rosa (la rosa / soggetto)
• Gen. rosae (della rosa)
• Dat. rosae (alla rosa)
• Acc. rosam (la rosa / oggetto)
• Voc. rosa (o rosa!)
• Abl. rosa (con/da/in/per la rosa)

Plurale:
• Nom. rosae
• Gen. rosarum
• Dat. rosis
• Acc. rosas
• Voc. rosae
• Abl. rosis

Esempio: Rosa floret. = La rosa fiorisce.
Puellae rosam dant. = Le ragazze danno la rosa.`,
      },
      {
        title: "Come tradurre senza panico",
        body: `1) Trova il VERBO (spesso in fondo)
2) Trova il SOGGETTO (nominativo, accordo col verbo)
3) Cerca ACCUSATIVO (oggetto diretto)
4) Il resto: genitivo/dativo/ablativo con le preposizioni o il senso
Non tradurre parola per parola da sinistra a destra come in italiano.`,
      },
      {
        title: "Allenamento espresso",
        body: `A memoria, senza guardare:
• Accusativo singolare di rosa? → rosam
• Genitivo plurale? → rosarum
• Dat./Abl. plurale? → rosis
Se non esce in 2 secondi, riscrivi la tabella 3 volte e rifai il quiz.`,
      },
    ],
    quiz: [
      {
        id: uid("q"),
        prompt: "Qual è l'accusativo singolare di rosa, -ae?",
        options: ["rosae", "rosam", "rosa", "rosarum"],
        correctIndex: 1,
        explanation: "Acc. sing. 1ª declinazione = tema + -am → rosam.",
      },
      {
        id: uid("q"),
        prompt: "In 'Puella rosam amat', che caso è rosam?",
        options: [
          "Nominativo (soggetto)",
          "Accusativo (oggetto)",
          "Genitivo (complemento di specificazione)",
          "Ablativo",
        ],
        correctIndex: 1,
        explanation:
          "rosam termina in -am: accusativo singolare, oggetto di amat.",
      },
      {
        id: uid("q"),
        prompt: "Cosa indichi sempre quando impari un nome latino?",
        options: [
          "Solo il nominativo",
          "Nominativo + genitivo + genere",
          "Solo la traduzione italiana",
          "Solo il plurale",
        ],
        correctIndex: 1,
        explanation:
          "rosa, -ae, f. ti dice tema, declinazione e genere. Solo 'rosa' non basta.",
      },
      {
        id: uid("q"),
        prompt: "Il genitivo plurale di rosa è:",
        options: ["rosis", "rosae", "rosarum", "rosas"],
        correctIndex: 2,
        explanation: "Gen. pl. 1ª decl. = -arum → rosarum (delle rose).",
      },
      {
        id: uid("q"),
        prompt: "Perché non traduci il latino da sinistra a destra come l'italiano?",
        options: [
          "Perché le parole sono a caso",
          "Perché il ruolo lo dice la desinenza, non l'ordine",
          "Perché non esistono i verbi",
          "Perché il soggetto è sempre alla fine",
        ],
        correctIndex: 1,
        explanation:
          "In latino l'ordine è più libero: i casi (desinenze) dicono chi fa cosa.",
      },
    ],
    flashcards: [
      { id: uid("f"), front: "rosa, -ae, f. → gen. sing.", back: "rosae" },
      { id: uid("f"), front: "rosa, -ae → acc. sing.", back: "rosam" },
      { id: uid("f"), front: "rosa, -ae → gen. pl.", back: "rosarum" },
      {
        id: uid("f"),
        front: "Funzione dell'accusativo",
        back: "Di solito oggetto diretto (chi/che cosa subisce l'azione).",
      },
      {
        id: uid("f"),
        front: "Puellae rosam dant",
        back: "Le ragazze danno la rosa. (Nom. pl. + Acc. + verbo)",
      },
    ],
    playground: [
      {
        id: uid("p"),
        title: "Scrivi la tabella",
        prompt:
          "Senza guardare, scrivi i 6 casi di 'rosa' al singolare (Nom. Gen. Dat. Acc. Voc. Abl.).",
        hint: "Nom. rosa · Gen. rosae · Dat. rosae · Acc. rosam · Voc. rosa · Abl. rosa",
        sampleAnswer: "rosa, rosae, rosae, rosam, rosa, rosa",
      },
      {
        id: uid("p"),
        title: "Traduci",
        prompt: "Traduci: 'Poeta rosas puellis dat.'",
        hint: "poeta = soggetto; rosas = acc. pl.; puellis = dat. pl.; dat = dà",
        sampleAnswer: "Il poeta dà le rose alle ragazze.",
      },
    ],
    videos: [
      {
        title: "1ª declinazione spiegata",
        query: "latino prima declinazione rosa spiegazione",
        why: "Rivedere la tabella a voce alta aiuta la memoria.",
      },
      {
        title: "Come tradurre una frase latina",
        query: "come tradurre latino metodo verbo soggetto",
        why: "Il metodo verbo-soggetto-complementi evita traduzioni a caso.",
      },
    ],
    games: [
      {
        id: uid("g"),
        type: "truefalse",
        prompt: "Vero o falso: 'rosam' è nominativo.",
        items: ["Vero", "Falso"],
        answer: false,
        explanation: "Falso: -am è accusativo singolare.",
      },
      {
        id: uid("g"),
        type: "match",
        prompt: "Abbina desinenza e caso (1ª decl. sing.)",
        items: [
          "-a → Nominativo/Ablativo/Vocativo",
          "-ae → Genitivo/Dativo",
          "-am → Accusativo",
        ],
        answer: [
          "-a → Nominativo/Ablativo/Vocativo",
          "-ae → Genitivo/Dativo",
          "-am → Accusativo",
        ],
        explanation: "Memorizza i pattern, non le singole parole una a una.",
      },
      {
        id: uid("g"),
        type: "order",
        prompt: "Ordina i passi per tradurre una frase",
        items: [
          "Trova il verbo",
          "Trova il soggetto (nominativo)",
          "Trova l'oggetto (accusativo)",
          "Sistema genitivi/dativi/ablativi",
        ],
        answer: [
          "Trova il verbo",
          "Trova il soggetto (nominativo)",
          "Trova l'oggetto (accusativo)",
          "Sistema genitivi/dativi/ablativi",
        ],
        explanation: "Questo ordine evita traduzioni parola-per-parola inutili.",
      },
    ],
  });
}

function fromBookText(
  input: GenerateRequest,
  topic: string,
  book: string
): LearningPack {
  const chunks = book
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20)
    .slice(0, 6);

  const lines = book
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 8);

  return base(input, {
    title: topic.slice(0, 100),
    hook: "Ho usato il testo che hai incollato/scattato (senza AI). Sotto trovi estratti e domande sul TUO pezzo di libro.",
    summary:
      "Modalità offline: non invento la materia. Lavoriamo sul testo che hai fornito. Per spiegazioni più ricche configura Ollama o la tua API key e rigenera.",
    keyPoints:
      lines.length >= 3
        ? lines.slice(0, 5)
        : chunks.slice(0, 4).map((c) => c.slice(0, 120)),
    analogy:
      "Tratta il brano come un messaggio da decifrare: prima di cosa parla, poi i dettagli, poi un esempio tuo.",
    lessonSections: [
      {
        title: "Dal tuo libro",
        body: book.slice(0, 1200) + (book.length > 1200 ? "…" : ""),
      },
      {
        title: "Cosa fare adesso",
        body: "1) Sottolinea 5 termini che non conosci\n2) Riscrivi il senso del brano in 3 frasi tue\n3) Fai il quiz e il playground\n4) Se l'AI è configurata, rigenera il percorso per avere spiegazioni e quiz più mirati",
      },
      {
        title: "Frasi da riformulare",
        body:
          chunks.slice(0, 3).map((c, i) => `${i + 1}. ${c}`).join("\n\n") ||
          book.slice(0, 400),
      },
    ],
    quiz: [
      {
        id: uid("q"),
        prompt: "Qual è il modo migliore di usare questo testo?",
        options: [
          "Rileggerlo 10 volte senza fermarsi",
          "Estrarre idea centrale + 3 dettagli + un esempio",
          "Ignorarlo e cercare solo riassunti online",
          "Imparare a memoria la prima riga",
        ],
        correctIndex: 1,
        explanation: "Idea centrale + dettagli + esempio batte la ripetizione passiva.",
      },
      {
        id: uid("q"),
        prompt: "Hai un pezzo di libro: cosa chiedi all'AI quando funziona?",
        options: [
          "Di inventare un altro argomento",
          "Di spiegare QUESTO testo e farti quiz su di esso",
          "Di tradurlo in latino a caso",
          "Di ignorare il testo",
        ],
        correctIndex: 1,
        explanation: "Il valore è sul tuo materiale, non su discorsi generici.",
      },
      {
        id: uid("q"),
        prompt: "Dopo aver letto il brano, il passo utile è:",
        options: [
          "Chiudere il libro",
          "Spiegarlo ad alta voce senza guardare",
          "Sottolineare tutto di giallo",
          "Copiare il testo a mano tre volte",
        ],
        correctIndex: 1,
        explanation: "Richiamo attivo: se non riesci a dirlo, non l'hai capito.",
      },
      {
        id: uid("q"),
        prompt: "Se l'argomento è enorme (es. 'tutto il programma'), cosa fai?",
        options: [
          "Un solo percorso da 200 pagine",
          "Spezzi in micro-argomenti (un capitolo/tema per volta)",
          "Aspetti la notte prima della verifica",
          "Studi solo i titoli",
        ],
        correctIndex: 1,
        explanation: "Un percorso = un pezzo masticabile. Altrimenti esce solo aria fritta.",
      },
    ],
    flashcards: lines.slice(0, 4).map((l) => ({
      id: uid("f"),
      front: "Ricorda / spiega",
      back: l.slice(0, 200),
    })),
    playground: [
      {
        id: uid("p"),
        title: "Riassunto in 5 frasi",
        prompt: "Riassumi il brano del libro in massimo 5 frasi, con parole tue.",
        hint: "Non copiare. Chi / cosa / perché / esempio.",
        sampleAnswer: "Dipende dal tuo testo: idea centrale + 2 dettagli + 1 esempio.",
      },
    ],
    videos: [
      {
        title: `Video su ${topic.slice(0, 40)}`,
        query: `${topic} spiegazione scuola`,
        why: "Un secondo canale spiega meglio se il libro è confuso.",
      },
    ],
    games: [
      {
        id: uid("g"),
        type: "truefalse",
        prompt: "Vero o falso: con un argomento enorme conviene un solo mega-riassunto vago.",
        items: ["Vero", "Falso"],
        answer: false,
        explanation: "Falso. Spezza in pezzi concreti (es. '1ª declinazione', non 'tutto il latino').",
      },
      {
        id: uid("g"),
        type: "order",
        prompt: "Ordina il metodo di studio sul testo",
        items: [
          "Leggi il brano",
          "Scrivi l'idea centrale",
          "Fai quiz/playground",
          "Ripeti ad alta voce",
        ],
        answer: [
          "Leggi il brano",
          "Scrivi l'idea centrale",
          "Fai quiz/playground",
          "Ripeti ad alta voce",
        ],
        explanation: "Lettura → elaborazione → prova → richiamo.",
      },
    ],
  });
}

function honestFallback(input: GenerateRequest, topic: string): LearningPack {
  const tooBroad = /tutti|intero|programma|tutto |ogni /i.test(topic);

  return base(input, {
    title: tooBroad ? `Troppo ampio: spezza "${topic.slice(0, 60)}"` : topic,
    hook: "L'AI non ha generato una lezione vera (offline o errore modello). Non ti invento roba a caso sulla materia.",
    summary: tooBroad
      ? `"${topic}" è un PROGRAMMA INTERO, non una lezione. Scegli un pezzo concreto (es. per il latino: "1ª declinazione", "perfetto indicativo", "cum + congiuntivo") e rigenera. Oppure incolla/scatta la pagina del libro.`
      : `Per spiegare davvero "${topic}" serve l'AI (Ollama o la tua API key) oppure il testo del libro. Ora hai solo una guida su come impostare lo studio, non il contenuto della materia.`,
    keyPoints: [
      tooBroad
        ? "Argomento troppo vasto → spezzalo in un tema solo"
        : `Tema scelto: ${topic}`,
      "Incolla o scatta la pagina del libro (OCR) per lavorare sul testo vero",
      "Configura Ollama o la tua API key in Impostazioni AI",
      "Poi rigenera: deve uscire grammatica/fatti/esempi, non frasi sullo 'studiare bene'",
    ],
    analogy:
      "Chiedere 'insegnami tutto il latino di 2 anni' è come chiedere 'insegnami tutta la matematica': serve il capitolo di oggi.",
    lessonSections: [
      {
        title: "Cosa non fare",
        body: "Non studiare da riassunti generici tipo 'impara con un esempio e un perché' senza CONTENUTO. Se leggi solo metodo di studio, non stai imparando la materia.",
      },
      {
        title: "Cosa fare adesso (3 minuti)",
        body: `1) Vai su Impostazioni AI e verifica Ollama (o la tua key) con "Prova connessione"
2) Crea un percorso su un pezzo PICCOLO. Esempi:
   • Latino: "prima declinazione rosa"
   • Storia: "cause della Prima Guerra Mondiale"
   • Mate: "equazioni di secondo grado: formula risolutiva"
3) Oppure incolla 1-2 pagine del libro e genera da quello`,
      },
      {
        title: "Se usi Ollama",
        body: "Apri un terminale: ollama serve (se non gira) e ollama list. Poi in Impostazioni scegli Ollama e un modello (llama3 / phi3). La generazione può richiedere 1-2 minuti sul PC.",
      },
    ],
    quiz: [
      {
        id: uid("q"),
        prompt: "Quale argomento è abbastanza piccolo per un buon percorso?",
        options: [
          "Tutto il latino di prima e seconda",
          "1ª declinazione (rosa, -ae)",
          "Tutta la storia del Novecento",
          "Tutta la matematica delle superiori",
        ],
        correctIndex: 1,
        explanation: "Un blocco masticabile produce lezione e quiz veri.",
      },
      {
        id: uid("q"),
        prompt: "Se l'AI non risponde, la cosa utile è:",
        options: [
          "Fingere di studiare da frasi generiche",
          "Incollare il libro o riparare Ollama/API key e rigenerare",
          "Creare 20 percorsi vuoti",
          "Ignorare la materia",
        ],
        correctIndex: 1,
        explanation: "Serve materiale reale o un modello che funziona.",
      },
      {
        id: uid("q"),
        prompt: "A cosa serve l'OCR in Volentieri?",
        options: [
          "A decorare",
          "A trasformare la foto della pagina in testo da studiare",
          "A sostituire il professore senza testo",
          "A caricare video",
        ],
        correctIndex: 1,
        explanation: "Foto pagina → testo → percorso sul TUO libro.",
      },
      {
        id: uid("q"),
        prompt: "Perché 'tutto il programma' fallisce come titolo di lezione?",
        options: [
          "Perché l'AI odia i programmi",
          "Perché è troppo ampio: esce aria fritta invece di contenuti",
          "Perché il latino non si può studiare online",
          "Perché serve solo l'inglese",
        ],
        correctIndex: 1,
        explanation: "Scope stretto = esempi, tabelle, quiz sensati.",
      },
    ],
    flashcards: [
      {
        id: uid("f"),
        front: "Regola d'oro Volentieri",
        back: "Un percorso = un pezzo concreto (non un intero anno scolastico).",
      },
      {
        id: uid("f"),
        front: "Se vedi solo frasi sullo 'studiare bene'",
        back: "Non è una lezione: manca AI o testo del libro. Rigenera.",
      },
    ],
    playground: [
      {
        id: uid("p"),
        title: "Scegli il micro-argomento",
        prompt: `Parti da "${topic}" e scrivi 3 titoli di percorsi PICCOLI da fare in 20-30 minuti ciascuno.`,
        hint: "Esempio latino: 1ª declinazione · 2ª declinazione · presente di amo",
        sampleAnswer:
          "1) Prima declinazione  2) Seconda declinazione  3) Presente indicativo 1ª coniugazione",
      },
    ],
    videos: [
      {
        title: "Cerca un video mirato",
        query: `${topic.split(/\s+/).slice(0, 6).join(" ")} spiegazione scuola`,
        why: "Con un titolo troppo ampio, cerca il singolo capitolo sul video.",
      },
    ],
    games: [
      {
        id: uid("g"),
        type: "truefalse",
        prompt:
          "Vero o falso: un percorso intitolato 'tutto il programma di 2 anni' produce di solito lezioni inutili.",
        items: ["Vero", "Falso"],
        answer: true,
        explanation: "Vero. Spezza il programma o usa il libro.",
      },
      {
        id: uid("g"),
        type: "order",
        prompt: "Ordina i passi giusti",
        items: [
          "Scegli un micro-argomento o la pagina del libro",
          "Verifica che l'AI risponda (test connessione)",
          "Genera il percorso",
          "Fai quiz e playground sul contenuto vero",
        ],
        answer: [
          "Scegli un micro-argomento o la pagina del libro",
          "Verifica che l'AI risponda (test connessione)",
          "Genera il percorso",
          "Fai quiz e playground sul contenuto vero",
        ],
        explanation: "Input buono + AI ok = output utile.",
      },
    ],
  });
}

/** Rileva filler stile "impara volentieri" senza contenuto di materia. */
export function isLowQualityPack(pack: LearningPack, topic: string): boolean {
  const blob = [
    pack.summary,
    pack.hook,
    ...pack.keyPoints,
    ...pack.lessonSections.map((s) => s.body),
  ]
    .join("\n")
    .toLowerCase();

  const fillerSignals = [
    "come se fosse una storia che ha senso",
    "spiegare l'argomento a un amico in mensa",
    "i 3 errori tipici da evitare",
    "un trucco mnemonico facile da ricordare",
    "non una pagina da memorizzare",
    "zero panico",
    "studio interattivo",
  ];
  const fillerHits = fillerSignals.filter((s) => blob.includes(s)).length;

  // title repeated too much, no substance
  const topicWords = topic
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .slice(0, 5);
  let topicRepetitions = 0;
  for (const w of topicWords) {
    const re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const m = blob.match(re);
    if (m && m.length >= 8) topicRepetitions++;
  }

  const hasConcrete = /(declin|coniug|equaz|teorem|battaglia|cellul|formula|genitiv|accusativ|nominativ|ablativ|verbo|proposiz)/i.test(
    blob
  );

  if (fillerHits >= 2 && !hasConcrete) return true;
  if (topicRepetitions >= 3 && !hasConcrete) return true;
  if (pack.lessonSections.every((s) => s.body.length < 80) && !hasConcrete)
    return true;

  return false;
}
