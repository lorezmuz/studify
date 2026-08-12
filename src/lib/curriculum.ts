import latinoBiennio from "@/data/curriculum/latino-biennio.json";

export type CurriculumUnit = {
  id: string;
  title: string;
  order: number;
  topics: string[];
  goal: string;
};

export type CurriculumCourse = {
  id: string;
  title: string;
  subject: string;
  level: string;
  description: string;
  units: CurriculumUnit[];
};

const COURSES: CurriculumCourse[] = [
  latinoBiennio as CurriculumCourse,
];

export function listCourses(): CurriculumCourse[] {
  return COURSES;
}

export function getCourse(id: string): CurriculumCourse | null {
  return COURSES.find((c) => c.id === id) ?? null;
}

/**
 * Come costruire un DB "tipo Knowunity" nel tempo:
 *
 * 1. SEED (ora): file JSON in src/data/curriculum — mappa unità, zero API.
 * 2. SUPABASE: tabelle courses / units / unit_content (lezioni scritte o generate una volta).
 * 3. UGC: studenti/insegnanti caricano appunti (più avanti, con moderazione).
 * 4. GENERATE-ONCE: Ollama genera il pack di un'unità e lo SALVI; non rigeneri ogni volta.
 *
 * Knowunity ha (2)+(3) a scala industriale + AI cloud. Noi partiamo da (1)+(4).
 */
