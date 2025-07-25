import { useState, useEffect, useCallback } from "react";
import type { Lexeme } from "@/types";
import type { HintData, HintStatus } from "@/types/hint";
import { hintService } from "@/lib/HintService";

type UseHintOptions = {
  prefetch?: boolean;
};

export const useHint = (lexeme: Lexeme, options: UseHintOptions = {}) => {
  const [hint, setHint] = useState<HintData | null>(null);
  const [status, setStatus] = useState<HintStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const fetchHint = useCallback(
    async (signal: AbortSignal) => {
      try {
        setStatus("loading");
        setError(null);

        const hintData = await hintService.getHint(lexeme);

        if (!signal.aborted) {
          setHint(hintData);
          setStatus("ready");
        }
      } catch (err) {
        if (!signal.aborted) {
          setError(err instanceof Error ? err.message : "Failed to generate hint");
          setStatus("error");
        }
      }
    },
    [lexeme]
  );

  useEffect(() => {
    // Reset state when lexeme changes
    setHint(null);
    setStatus("idle");
    setError(null);

    const controller = new AbortController();

    // Prefetch on mount if requested
    if (options.prefetch) {
      fetchHint(controller.signal);
    }

    return () => {
      controller.abort();
    };
  }, [lexeme.text, options.prefetch, fetchHint]);

  const loadHint = useCallback(() => {
    if (status === "idle" || status === "error") {
      const controller = new AbortController();
      fetchHint(controller.signal);
    }
  }, [status, fetchHint]);

  return {
    hint,
    status,
    error,
    loadHint,
  };
};
