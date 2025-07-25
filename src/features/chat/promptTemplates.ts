export const CHAT_PROMPT_TEMPLATES = [
  {
    id: "explain-word",
    label: "Explain this word",
    prompt:
      "Can you explain the Indonesian word '{{currentWord}}' including its meaning, usage, and any cultural context?",
    category: "vocabulary",
  },
  {
    id: "give-examples",
    label: "Give me examples",
    prompt:
      "Please provide 5 example sentences using the Indonesian word '{{currentWord}}' with English translations.",
    category: "vocabulary",
  },
  {
    id: "similar-words",
    label: "Similar words",
    prompt:
      "What are some Indonesian words similar to '{{currentWord}}'? Please explain the differences.",
    category: "vocabulary",
  },
  {
    id: "memory-tips",
    label: "Help me remember",
    prompt:
      "Can you give me memory tricks or mnemonics to remember the Indonesian word '{{currentWord}}'?",
    category: "learning",
  },
  {
    id: "grammar-explain",
    label: "Explain grammar",
    prompt:
      "Please explain the Indonesian grammar rules that apply to '{{currentWord}}' and how to use it correctly.",
    category: "grammar",
  },
  {
    id: "practice-sentences",
    label: "Practice sentences",
    prompt:
      "Give me 3 fill-in-the-blank sentences to practice using '{{currentWord}}'. Include the answers separately.",
    category: "practice",
  },
  {
    id: "common-mistakes",
    label: "Common mistakes",
    prompt:
      "What are common mistakes learners make with the Indonesian word '{{currentWord}}' and how to avoid them?",
    category: "learning",
  },
  {
    id: "word-family",
    label: "Word family",
    prompt:
      "Show me the word family of '{{currentWord}}' including its root, derivatives, and related forms in Indonesian.",
    category: "vocabulary",
  },
] as const;

export type PromptTemplate = (typeof CHAT_PROMPT_TEMPLATES)[number];
