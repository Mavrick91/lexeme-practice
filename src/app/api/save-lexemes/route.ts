import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile } from "fs/promises";
import path from "path";
import type { Lexeme } from "@/types";
import type { ApiError } from "@/types/api";

export type SaveLexemesRequest = {
  lexemes: Lexeme[];
  merge?: boolean; // Whether to merge with existing lexemes or replace
};

export type SaveLexemesResponse = {
  success: boolean;
  count: number;
  message: string;
};

export const POST = async (request: NextRequest) => {
  try {
    const body: SaveLexemesRequest = await request.json();
    const { lexemes, merge = true } = body;

    if (!lexemes || !Array.isArray(lexemes)) {
      throw new Error("Invalid lexemes data");
    }

    // Path to the combined_lexemes.json file
    const filePath = path.join(process.cwd(), "src", "combined_lexemes.json");

    let finalLexemes = lexemes;

    if (merge) {
      // Read existing lexemes and merge
      try {
        const existingData = await readFile(filePath, "utf-8");
        const existing = JSON.parse(existingData);

        // Create a map for deduplication based on text
        const lexemeMap = new Map<string, Lexeme>();

        // Add existing lexemes
        if (existing.learnedLexemes && Array.isArray(existing.learnedLexemes)) {
          existing.learnedLexemes.forEach((lexeme: Lexeme) => {
            lexemeMap.set(lexeme.text, lexeme);
          });
        }

        // Add/update with new lexemes
        lexemes.forEach((lexeme) => {
          lexemeMap.set(lexeme.text, lexeme);
        });

        finalLexemes = Array.from(lexemeMap.values());
      } catch {
        // File doesn't exist or is invalid, use only new lexemes
        // Using console.log for development debugging
        // eslint-disable-next-line no-console
        console.log("No existing lexemes file found, creating new one");
      }
    }

    // Sort lexemes alphabetically by text
    finalLexemes.sort((a, b) => a.text.localeCompare(b.text));

    // Write to file
    const dataToSave = {
      learnedLexemes: finalLexemes,
    };

    await writeFile(filePath, JSON.stringify(dataToSave, null, 2), "utf-8");

    const response: SaveLexemesResponse = {
      success: true,
      count: finalLexemes.length,
      message: merge
        ? `Successfully saved ${finalLexemes.length} lexemes (merged)`
        : `Successfully saved ${finalLexemes.length} lexemes (replaced)`,
    };

    return NextResponse.json(response);
  } catch (error) {
    const errorResponse: ApiError = {
      error: "Failed to save lexemes",
      details: error instanceof Error ? error.message : "Unknown error",
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
};
