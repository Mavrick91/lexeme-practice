export const CHAT_PROMPT_TEMPLATES = [
  {
    id: "explain-word",
    label: "Explain this word",
    prompt:
      "Can you explain the Indonesian word '{{currentWord}}' including its meaning, usage, and any cultural context?",
    category: "vocabulary",
  },
  {
    id: "informal-ways",
    label: "Informal ways",
    prompt:
      "What are the informal or colloquial ways to say '{{currentWord}}' in Indonesian? Please list them from most commonly used to least commonly used, and explain when each would be appropriate to use.",
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
      "Break down the Indonesian word '{{currentWord}}' into English-sounding syllables or parts, then create a memorable story that connects these parts to its meaning. Format your response like this:\n\n1. **[Part 1]**: [English word/sound it resembles] - [brief description]\n2. **[Part 2]**: [English word/sound it resembles] - [brief description]\n3. **[Part 3]**: (if applicable)\n\nThen create a short, vivid story using these English words that helps remember the meaning. The story should naturally connect the sound-alike words to the actual meaning of '{{currentWord}}'.\n\nExample format:\nFor 'dukungan' (support):\n1. **Duke**: A nobleman\n2. **Gun**: A weapon (sounds like 'kung')\n3. **Gan**: Short for 'gang' or group\n\nStory: Imagine a duke with a gun protecting his gang - this strong image of protection and backing helps you remember 'dukungan' means support.",
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
