export type PianoRow = {
  id: string;
  materia: string;
  argomenti: string;
  data_esame: string | null;
  voto_obiettivo: number | null;
  riassunto: string | null;
  ai_provider: string;
  stato: string;
  errore: string | null;
  roadmap_json: string | null;
  progress_json: string | null;
  creato_il: string;
};

export type FlashcardRow = {
  id: string;
  piano_id: string;
  fronte: string;
  retro: string;
  prossima_revisione: string;
  livello: number;
  intervallo_giorni: number;
  fattore_facilita: number;
};

export type QuizRow = {
  id: string;
  piano_id: string;
  numero: number;
  domande_json: string;
};

export type QuizDomanda = {
  domanda: string;
  opzioni: string[];
  risposta_corretta: number;
};

export type RoadmapNode = {
  id: string;
  day: number;
  order: number;
  title: string;
  description: string;
  type: "read" | "flashcards" | "quiz" | "review" | "chest";
  sectionIndex?: number;
  status: "locked" | "current" | "done";
};

export type RoadmapProgress = {
  completedIds: string[];
  xp: number;
  lastDayCompleted: number;
};

export type Section = { title: string; body: string };

export type PianoBundle = {
  piano: PianoRow;
  flashcard: FlashcardRow[];
  quiz: QuizRow[];
  risultati?: Record<string, unknown>[];
  roadmap: RoadmapNode[];
  progress: RoadmapProgress;
  sections: Section[];
};

export type OutboxItem =
  | {
      id: string;
      type: "complete_node";
      pianoId: string;
      nodeId: string;
      createdAt: string;
    }
  | {
      id: string;
      type: "flashcard";
      flashcardId: string;
      valutazione: number;
      createdAt: string;
    }
  | {
      id: string;
      type: "quiz_result";
      quizId: string;
      risposte: number[];
      punteggio: number;
      createdAt: string;
    }
  | {
      id: string;
      type: "progress";
      pianoId: string;
      progress: RoadmapProgress;
      createdAt: string;
    };

export type AppSettings = {
  baseUrl: string;
  lastSyncAt: string | null;
};
