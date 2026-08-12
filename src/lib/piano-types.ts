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
