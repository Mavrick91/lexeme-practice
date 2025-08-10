"use client";

import { useMemo, useRef, useState } from "react";
import type { Lexeme } from "@/types";
import type { ProgressedSkill } from "@/types/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type WordsTableProps = {
  lexemes: Lexeme[];
};

export const WordsTable = ({ lexemes }: WordsTableProps) => {
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const audioRef = useRef<globalThis.HTMLAudioElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return lexemes;
    return lexemes.filter(
      (l) =>
        l.text.toLowerCase().includes(q) || l.translations.some((t) => t.toLowerCase().includes(q))
    );
  }, [lexemes, query]);

  const play = async (url: string, id: string) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const a = audioRef.current;

    // Toggle pause if the same item is playing
    if (current === id && !a.paused) {
      a.pause();
      setCurrent(null);
      return;
    }

    a.src = url;
    a.currentTime = 0;
    try {
      await a.play();
      setCurrent(id);
      a.onended = () => setCurrent(null);
    } catch {
      setCurrent(null);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // First, fetch user progress to get skill data
      toast.info("Fetching user progress...");

      const progressResponse = await fetch("/api/fetch-user-progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!progressResponse.ok) {
        throw new Error("Failed to fetch user progress");
      }

      const progressData = await progressResponse.json();

      // Extract skills data from the response
      const responses = progressData.responses;
      if (!responses || !responses[0]) {
        throw new Error("Invalid progress data structure");
      }

      // Check if the response is compressed
      if (responses[0].bodyCompressed) {
        throw new Error(
          `Server sent compressed response (${responses[0].compressionType}). Unable to process.`
        );
      }

      if (!responses[0].body) {
        throw new Error("No body in response");
      }

      // The body should already be parsed if it was valid JSON
      let userData;
      if (typeof responses[0].body === "string") {
        try {
          userData = JSON.parse(responses[0].body);
        } catch {
          throw new Error("Failed to parse user data from response");
        }
      } else {
        userData = responses[0].body;
      }

      // Extract skill IDs from the pathSectioned structure
      const pathSectioned = userData.currentCourse?.pathSectioned || [];
      const skillMap = new Map<string, { finishedSessions: number; finishedLevels: number }>();

      // Iterate through sections -> units -> levels to extract all skill IDs
      pathSectioned.forEach(
        (section: { units?: Array<{ levels?: Array<Record<string, unknown>> }> }) => {
          if (section.units && Array.isArray(section.units)) {
            section.units.forEach((unit: { levels?: Array<Record<string, unknown>> }) => {
              if (unit.levels && Array.isArray(unit.levels)) {
                unit.levels.forEach((level: Record<string, any>) => {
                  const skillId = level.pathLevelMetadata?.skillId;
                  const finishedSessions = level.finishedSessions || 0;
                  const state = level.state;

                  if (skillId) {
                    // Include ALL skills that are accessible or have any progress
                    if (
                      state === "completed" ||
                      state === "started" ||
                      state === "unlocked" ||
                      finishedSessions >= 0
                    ) {
                      if (!skillMap.has(skillId)) {
                        skillMap.set(skillId, { finishedSessions: 0, finishedLevels: 0 });
                      }

                      const current = skillMap.get(skillId)!;
                      current.finishedSessions = Math.max(
                        current.finishedSessions,
                        finishedSessions
                      );

                      // Count completed levels
                      if (state === "completed") {
                        current.finishedLevels += 1;
                      }
                    }
                  }
                });
              }
            });
          }
        }
      );

      // Also check the legacy skills array if it exists
      const legacySkills = userData.currentCourse?.skills || [];
      if (legacySkills.length > 0) {
        const flattenedSkills = legacySkills.flat();
        flattenedSkills.forEach((skill: Record<string, any>) => {
          if (skill.id && ((skill.finishedLevels ?? 0) > 0 || (skill.finishedLessons ?? 0) > 0)) {
            if (!skillMap.has(skill.id)) {
              skillMap.set(skill.id, {
                finishedSessions: skill.finishedLessons || 0,
                finishedLevels: skill.finishedLevels || 0,
              });
            }
          }
        });
      }

      // Convert the skill map to the progressedSkills array format
      const progressedSkills: ProgressedSkill[] = Array.from(skillMap.entries()).map(
        ([skillId, data]) => ({
          skillId: { id: skillId },
          finishedLevels: data.finishedLevels,
          finishedSessions: data.finishedSessions,
        })
      );

      if (progressedSkills.length === 0) {
        toast.warning("No progressed skills found");
        return;
      }

      // Now fetch lexemes with pagination
      toast.info("Fetching lexemes from Duolingo...");

      const allLexemes: Lexeme[] = [];
      let startIndex = 0;
      const batchSize = 50;
      let totalLexemeCount = 0;
      let lastTotalLexemeCount = 0;

      // Keep fetching until we have all lexemes
      while (true) {
        const response = await fetch("/api/fetch-lexemes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            progressedSkills,
            startIndex,
            limit: batchSize,
            lastTotalLexemeCount,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch lexemes at index ${startIndex}`);
        }

        const data = await response.json();

        // Update total count from pagination
        if (data.pagination?.totalLexemes) {
          totalLexemeCount = data.pagination.totalLexemes;
          lastTotalLexemeCount = totalLexemeCount;
        }

        // Add lexemes from this batch
        if (data.learnedLexemes && data.learnedLexemes.length > 0) {
          allLexemes.push(...data.learnedLexemes);

          // Update progress toast
          toast.info(`Fetching lexemes: ${allLexemes.length} / ${totalLexemeCount || "?"}`);

          // Check if we've fetched all lexemes
          if (data.learnedLexemes.length < batchSize) {
            break;
          }

          // Check if there's no nextStartIndex (meaning we're done)
          if (data.pagination && data.pagination.nextStartIndex === null) {
            break;
          }

          // Also check against totalLexemes if available
          if (totalLexemeCount > 0 && allLexemes.length >= totalLexemeCount) {
            break;
          }

          // Move to next batch using nextStartIndex if available
          if (
            data.pagination?.nextStartIndex !== undefined &&
            data.pagination.nextStartIndex !== null
          ) {
            startIndex = data.pagination.nextStartIndex;
          } else {
            // Fallback to incrementing by batch size
            startIndex += batchSize;
          }

          // Safety check to prevent infinite loops
          if (startIndex > 5000) {
            break;
          }
        } else {
          // No more lexemes to fetch
          break;
        }

        // Small delay to avoid hammering the API
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (allLexemes.length > 0) {
        toast.success(`Successfully fetched all ${allLexemes.length} lexemes from Duolingo!`);

        // Save the fetched lexemes to the local file
        setIsSaving(true);
        toast.info("Saving lexemes to local file...");

        try {
          const saveResponse = await fetch("/api/save-lexemes", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              lexemes: allLexemes,
              merge: true, // Merge with existing lexemes
            }),
          });

          if (saveResponse.ok) {
            const saveData = await saveResponse.json();
            toast.success(saveData.message || "Lexemes saved successfully!");

            // Reload the page to show the updated lexemes
            toast.info("Refreshing page to show updated lexemes...");
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else {
            const errorData = await saveResponse.json();
            toast.error(`Failed to save lexemes: ${errorData.details || "Unknown error"}`);
          }
        } catch (saveError) {
          toast.error(
            `Failed to save lexemes: ${saveError instanceof Error ? saveError.message : "Unknown error"}`
          );
        } finally {
          setIsSaving(false);
        }
      } else {
        toast.info("No lexemes found.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sync lexemes");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search words or translations..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xl"
          aria-label="Search words or translations"
        />
        <div className="flex items-center gap-2">
          <Button onClick={handleSync} disabled={isSyncing || isSaving} variant="outline" size="sm">
            {isSyncing ? "Fetching..." : isSaving ? "Saving..." : "Fetch from Duolingo"}
          </Button>
          <Badge
            variant="secondary"
            aria-label={`Showing ${filtered.length} out of ${lexemes.length} results`}
          >
            {filtered.length} / {lexemes.length}
          </Badge>
        </div>
      </div>

      <div className="overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Word (ID)</th>
              <th className="px-4 py-2 text-left font-medium">Translations (EN)</th>
              <th className="px-4 py-2 text-left font-medium">Audio</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.text} className="border-t">
                <td className="px-4 py-2 font-medium">{l.text}</td>
                <td className="px-4 py-2 text-muted-foreground">{l.translations.join(", ")}</td>
                <td className="px-4 py-2">
                  <button
                    className={cn(
                      "rounded border px-3 py-1 text-xs transition-colors hover:bg-accent hover:text-accent-foreground",
                      current === l.text ? "bg-accent text-accent-foreground" : "bg-background"
                    )}
                    onClick={() => play(l.audioURL, l.text)}
                    aria-label={
                      current === l.text ? `Pause audio for ${l.text}` : `Play audio for ${l.text}`
                    }
                  >
                    {current === l.text ? "Pause" : "Play"}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-muted-foreground" colSpan={3}>
                  No results
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
