import { buildQuickMnemonicPrompt } from "@/lib/buildMnemonicPrompt";

const extractJSON = (prompt: string) => {
  const match = prompt.match(
    /\/\* MNEMONIC IMAGE SPECIFICATION \*\/[\r\n]+([\s\S]*?)[\r\n]+\/\* END SPECIFICATION \*\//
  );
  if (!match) throw new Error("JSON block not found");
  return JSON.parse(match[1]);
};

describe("buildQuickMnemonicPrompt", () => {
  it("uses scenario presets (kids)", () => {
    const prompt = buildQuickMnemonicPrompt("burung", ["bird"], "kids");
    const spec = extractJSON(prompt);

    expect(spec.word.text).toBe("burung");
    expect(spec.word.translations).toEqual(["bird"]);

    expect(spec.style.visual).toMatch(/pixel|8-bit/i);
    expect(spec.composition.layout).toMatch(/single/i);
    expect(spec.colors.palette).toBeDefined();
    expect(spec.technique.method).toBeDefined();

    expect(prompt).toMatch(/Style: .*pixel-art.*(monochrome|vibrant|high-contrast|pastel)/i);
  });

  it("allows memoryTip and scenario overrides to reflect in text", () => {
    const prompt = buildQuickMnemonicPrompt("anak", ["child"], "intermediate", "school scene");
    const spec = extractJSON(prompt);

    expect(spec.word.memoryTip).toBe("school scene");
    expect(prompt).toMatch(/Incorporate this memory tip: "school scene"/);
    expect(prompt).toMatch(/Style: comic-style/);
  });
});
