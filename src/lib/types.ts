export type Subject =
  | "matematica"
  | "italiano"
  | "storia"
  | "geografia"
  | "scienze"
  | "inglese"
  | "fisica"
  | "chimica"
  | "altro";

export type SessionMode =
  | "lesson"
  | "quiz"
  | "tutor"
  | "videos"
  | "game"
  | "playground";

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
}

export interface PlaygroundChallenge {
  id: string;
  title: string;
  prompt: string;
  hint: string;
  sampleAnswer: string;
}

export interface VideoSuggestion {
  title: string;
  query: string;
  why: string;
}

export interface GameRound {
  id: string;
  type: "match" | "order" | "truefalse";
  prompt: string;
  items: string[];
  answer: string[] | boolean;
  explanation: string;
}

export interface LearningPack {
  id: string;
  title: string;
  subject: Subject;
  level: "media" | "superiore";
  hook: string;
  summary: string;
  keyPoints: string[];
  analogy: string;
  lessonSections: { title: string; body: string }[];
  quiz: QuizQuestion[];
  flashcards: Flashcard[];
  playground: PlaygroundChallenge[];
  videos: VideoSuggestion[];
  games: GameRound[];
  sourcePreview: string;
  createdAt: string;
}

export interface UserProgress {
  xp: number;
  streak: number;
  lastStudyDate: string | null;
  sessionsCompleted: number;
  correctAnswers: number;
  totalAnswers: number;
}

export interface SessionRecord {
  pack: LearningPack;
  completedModes: SessionMode[];
  quizScore: number | null;
  xpEarned: number;
  updatedAt: string;
}

export interface GenerateRequest {
  topic: string;
  subject?: Subject;
  level?: "media" | "superiore";
  bookText?: string;
}
