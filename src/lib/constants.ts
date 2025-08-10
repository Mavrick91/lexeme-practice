export const DUOLINGO_CONFIG = {
  userId: process.env.DUOLINGO_USER_ID || "5362039",
  jwtToken: process.env.DUOLINGO_JWT_TOKEN || "",
  apiBaseUrl: process.env.DUOLINGO_API_BASE_URL || "https://ios-api-cf.duolingo.com/2023-05-23",
  learningLanguage: process.env.LEARNING_LANGUAGE || "id",
  fromLanguage: process.env.FROM_LANGUAGE || "en",
} as const;

export const API_HEADERS = {
  Host: "ios-api-cf.duolingo.com",
  "content-type": "application/json",
  accept: "*/*",
  "Accept-Encoding": "identity",
  priority: "u=3",
  "accept-language":
    "en-GB;q=1.0,fr-FR;q=0.9,en-FR;q=0.8,zh-Hant-FR;q=0.7,zh-Hans-FR;q=0.6,th-TH;q=0.5",
  "user-agent": "DuolingoMobile/7.85.0 (iPhone; iOS 19.0; Scale/3.00)",
} as const;

export const PAGINATION = {
  defaultLimit: 50,
  maxLimit: 100,
  safetyLimit: 5000,
} as const;
