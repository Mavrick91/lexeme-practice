import type { Lexeme } from "../types";

export type ProgressedSkill = {
  skillId: { id: string };
  finishedLevels: number;
  finishedSessions: number;
};

export type LexemePagination = {
  totalLexemes: number;
  nextStartIndex: number | null;
};

export type FetchLexemesRequest = {
  progressedSkills: ProgressedSkill[];
  startIndex?: number;
  limit?: number;
  lastTotalLexemeCount?: number;
};

export type FetchLexemesResponse = {
  learnedLexemes: Lexeme[];
  pagination?: LexemePagination;
};

export type UserProgressResponse = {
  responses: Array<{
    body: UserData | string;
    bodyCompressed?: boolean;
    compressionType?: string;
    headers?: Record<string, string>;
    status?: number;
  }>;
};

export type UserData = {
  currentCourse?: {
    pathSectioned?: PathSection[];
    skills?: Skill[][];
  };
};

export type PathSection = {
  units?: Unit[];
};

export type Unit = {
  levels?: Level[];
};

export type Level = {
  pathLevelMetadata?: {
    skillId?: string;
  };
  finishedSessions?: number;
  state?: "completed" | "started" | "unlocked" | "locked";
};

export type Skill = {
  id: string;
  finishedLevels?: number;
  finishedLessons?: number;
};

export type ApiError = {
  error: string;
  details?: string;
};
