import { formatPrompt } from "./formatPrompt";

describe("formatPrompt", () => {
  it("should replace single placeholder", () => {
    const template = "Hello {{name}}!";
    const variables = { name: "World" };
    expect(formatPrompt(template, variables)).toBe("Hello World!");
  });

  it("should replace multiple placeholders", () => {
    const template = "The word '{{word}}' means '{{meaning}}'";
    const variables = { word: "rumah", meaning: "house" };
    expect(formatPrompt(template, variables)).toBe("The word 'rumah' means 'house'");
  });

  it("should leave unmatched placeholders unchanged", () => {
    const template = "Hello {{name}}, welcome to {{place}}!";
    const variables = { name: "John" };
    expect(formatPrompt(template, variables)).toBe("Hello John, welcome to {{place}}!");
  });

  it("should handle empty variables object", () => {
    const template = "Hello {{name}}!";
    const variables = {};
    expect(formatPrompt(template, variables)).toBe("Hello {{name}}!");
  });

  it("should handle template with no placeholders", () => {
    const template = "Hello World!";
    const variables = { name: "John" };
    expect(formatPrompt(template, variables)).toBe("Hello World!");
  });
});
