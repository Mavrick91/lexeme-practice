export type HintData = {
  relatedWords: string[];
  timestamp: number;
  source: "gpt" | "fallback";
};

export type HintCache = {
  [lexemeText: string]: HintData;
};

export type HintStatus = "idle" | "loading" | "ready" | "error";
