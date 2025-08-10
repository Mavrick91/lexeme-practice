import { POST } from "./route";
import { NextRequest } from "next/server";
import { writeFile, readFile } from "fs/promises";
import type { Lexeme } from "@/types";
import type { SaveLexemesRequest } from "./route";

// Mock fs/promises
jest.mock("fs/promises", () => ({
  writeFile: jest.fn(),
  readFile: jest.fn(),
}));

// Mock path.join to return a predictable path
jest.mock("path", () => ({
  join: jest.fn(() => "/test/path/combined_lexemes.json"),
}));

describe("save-lexemes API route", () => {
  const mockLexemes: Lexeme[] = [
    {
      text: "hola",
      translations: ["hello"],
      audioURL: "https://example.com/hola.mp3",
    },
    {
      text: "gracias",
      translations: ["thanks"],
      audioURL: "https://example.com/gracias.mp3",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Replace mode (merge=false)", () => {
    it("should save lexemes without merging", async () => {
      const requestBody: SaveLexemesRequest = {
        lexemes: mockLexemes,
        merge: false,
      };

      const request = new NextRequest("http://localhost:3000/api/save-lexemes", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        count: 2,
        message: "Successfully saved 2 lexemes (replaced)",
      });

      // Verify writeFile was called with sorted lexemes
      expect(writeFile).toHaveBeenCalledWith(
        "/test/path/combined_lexemes.json",
        expect.stringContaining('"learnedLexemes"'),
        "utf-8"
      );

      const writtenData = JSON.parse((writeFile as jest.Mock).mock.calls[0][1]);
      expect(writtenData.learnedLexemes).toHaveLength(2);
      expect(writtenData.learnedLexemes[0].text).toBe("gracias"); // Should be sorted
      expect(writtenData.learnedLexemes[1].text).toBe("hola");
    });
  });

  describe("Merge mode (merge=true)", () => {
    it("should merge with existing lexemes", async () => {
      const existingLexemes = {
        learnedLexemes: [
          {
            text: "adios",
            translations: ["goodbye"],
            audioURL: "https://example.com/adios.mp3",
          },
          {
            text: "hola", // Duplicate, should be updated
            translations: ["hi"], // Different translation
            audioURL: "https://example.com/old-hola.mp3",
          },
        ],
      };

      (readFile as jest.Mock).mockResolvedValueOnce(JSON.stringify(existingLexemes));

      const requestBody: SaveLexemesRequest = {
        lexemes: mockLexemes,
        merge: true,
      };

      const request = new NextRequest("http://localhost:3000/api/save-lexemes", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        count: 3, // adios + updated hola + gracias
        message: "Successfully saved 3 lexemes (merged)",
      });

      const writtenData = JSON.parse((writeFile as jest.Mock).mock.calls[0][1]);
      expect(writtenData.learnedLexemes).toHaveLength(3);

      // Check sorting
      expect(writtenData.learnedLexemes[0].text).toBe("adios");
      expect(writtenData.learnedLexemes[1].text).toBe("gracias");
      expect(writtenData.learnedLexemes[2].text).toBe("hola");

      // Check that hola was updated
      const holaEntry = writtenData.learnedLexemes.find((l: Lexeme) => l.text === "hola");
      expect(holaEntry.translations).toEqual(["hello"]); // New translation
      expect(holaEntry.audioURL).toBe("https://example.com/hola.mp3"); // New URL
    });

    it("should handle non-existent file when merging", async () => {
      (readFile as jest.Mock).mockRejectedValueOnce(new Error("ENOENT: no such file"));

      const requestBody: SaveLexemesRequest = {
        lexemes: mockLexemes,
        merge: true,
      };

      const request = new NextRequest("http://localhost:3000/api/save-lexemes", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        count: 2,
        message: "Successfully saved 2 lexemes (merged)",
      });

      // Should still write the new lexemes
      expect(writeFile).toHaveBeenCalled();
      const writtenData = JSON.parse((writeFile as jest.Mock).mock.calls[0][1]);
      expect(writtenData.learnedLexemes).toHaveLength(2);
    });

    it("should handle invalid JSON in existing file", async () => {
      (readFile as jest.Mock).mockResolvedValueOnce("{ invalid json");

      const requestBody: SaveLexemesRequest = {
        lexemes: mockLexemes,
        merge: true,
      };

      const request = new NextRequest("http://localhost:3000/api/save-lexemes", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.count).toBe(2);

      // Should use only new lexemes when existing file is invalid
      const writtenData = JSON.parse((writeFile as jest.Mock).mock.calls[0][1]);
      expect(writtenData.learnedLexemes).toHaveLength(2);
    });

    it("should deduplicate lexemes based on text field", async () => {
      const duplicateLexemes: Lexeme[] = [
        {
          text: "hola",
          translations: ["hello"],
          audioURL: "https://example.com/hola1.mp3",
        },
        {
          text: "hola", // Duplicate
          translations: ["hi"],
          audioURL: "https://example.com/hola2.mp3",
        },
        {
          text: "gracias",
          translations: ["thanks"],
          audioURL: "https://example.com/gracias.mp3",
        },
      ];

      const requestBody: SaveLexemesRequest = {
        lexemes: duplicateLexemes,
        merge: true, // When merging, deduplication happens
      };

      const request = new NextRequest("http://localhost:3000/api/save-lexemes", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.count).toBe(2); // Should deduplicate

      const writtenData = JSON.parse((writeFile as jest.Mock).mock.calls[0][1]);
      expect(writtenData.learnedLexemes).toHaveLength(2);

      // The last duplicate should win
      const holaEntry = writtenData.learnedLexemes.find((l: Lexeme) => l.text === "hola");
      expect(holaEntry.translations).toEqual(["hi"]);
      expect(holaEntry.audioURL).toBe("https://example.com/hola2.mp3");
    });
  });

  describe("Error handling", () => {
    it("should handle invalid request body", async () => {
      const request = new NextRequest("http://localhost:3000/api/save-lexemes", {
        method: "POST",
        body: JSON.stringify({ notLexemes: [] }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: "Failed to save lexemes",
        details: "Invalid lexemes data",
      });
    });

    it("should handle non-array lexemes", async () => {
      const request = new NextRequest("http://localhost:3000/api/save-lexemes", {
        method: "POST",
        body: JSON.stringify({ lexemes: "not an array" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: "Failed to save lexemes",
        details: "Invalid lexemes data",
      });
    });

    it("should handle write errors", async () => {
      (writeFile as jest.Mock).mockRejectedValueOnce(new Error("Permission denied"));

      const requestBody: SaveLexemesRequest = {
        lexemes: mockLexemes,
        merge: false,
      };

      const request = new NextRequest("http://localhost:3000/api/save-lexemes", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: "Failed to save lexemes",
        details: "Permission denied",
      });
    });

    it("should handle JSON parse errors", async () => {
      const request = new NextRequest("http://localhost:3000/api/save-lexemes", {
        method: "POST",
        body: "{ invalid json",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to save lexemes");
      expect(data.details).toContain("JSON");
    });
  });

  describe("Data formatting", () => {
    it("should sort lexemes alphabetically by text", async () => {
      const unsortedLexemes: Lexeme[] = [
        { text: "zebra", translations: ["zebra"], audioURL: "" },
        { text: "apple", translations: ["apple"], audioURL: "" },
        { text: "mango", translations: ["mango"], audioURL: "" },
      ];

      const requestBody: SaveLexemesRequest = {
        lexemes: unsortedLexemes,
        merge: false,
      };

      const request = new NextRequest("http://localhost:3000/api/save-lexemes", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      await POST(request);

      const writtenData = JSON.parse((writeFile as jest.Mock).mock.calls[0][1]);
      expect(writtenData.learnedLexemes[0].text).toBe("apple");
      expect(writtenData.learnedLexemes[1].text).toBe("mango");
      expect(writtenData.learnedLexemes[2].text).toBe("zebra");
    });

    it("should format JSON with proper indentation", async () => {
      const requestBody: SaveLexemesRequest = {
        lexemes: mockLexemes,
        merge: false,
      };

      const request = new NextRequest("http://localhost:3000/api/save-lexemes", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      await POST(request);

      // Check that JSON.stringify was called with indent parameter
      const writtenContent = (writeFile as jest.Mock).mock.calls[0][1];
      expect(writtenContent).toContain("\n"); // Should have line breaks
      expect(writtenContent).toContain("  "); // Should have indentation
    });

    it("should preserve all lexeme properties", async () => {
      const lexemesWithExtraProps: Array<Record<string, unknown>> = [
        {
          text: "test",
          translations: ["test"],
          audioURL: "https://example.com/test.mp3",
          customProp: "value",
          nestedProp: { key: "value" },
        },
      ];

      const requestBody = {
        lexemes: lexemesWithExtraProps,
        merge: false,
      };

      const request = new NextRequest("http://localhost:3000/api/save-lexemes", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      await POST(request);

      const writtenData = JSON.parse((writeFile as jest.Mock).mock.calls[0][1]);
      expect(writtenData.learnedLexemes[0]).toMatchObject({
        text: "test",
        translations: ["test"],
        audioURL: "https://example.com/test.mp3",
        customProp: "value",
        nestedProp: { key: "value" },
      });
    });
  });
});
