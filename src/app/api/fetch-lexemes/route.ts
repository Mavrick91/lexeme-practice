/* global URL */
import { NextRequest, NextResponse } from "next/server";
import type { FetchLexemesRequest, FetchLexemesResponse, ApiError } from "@/types/api";
import { DUOLINGO_CONFIG, API_HEADERS, PAGINATION } from "@/lib/constants";

export const POST = async (request: NextRequest) => {
  try {
    const body: FetchLexemesRequest = await request.json();
    const {
      progressedSkills,
      startIndex = 0,
      limit = PAGINATION.defaultLimit,
      lastTotalLexemeCount = 0,
    } = body;

    const url = new URL(
      `${DUOLINGO_CONFIG.apiBaseUrl}/users/${DUOLINGO_CONFIG.userId}/courses/${DUOLINGO_CONFIG.learningLanguage}/${DUOLINGO_CONFIG.fromLanguage}/learned-lexemes`
    );
    url.searchParams.append("startIndex", startIndex.toString());
    url.searchParams.append("sortBy", "LEARNED_DATE");
    url.searchParams.append("limit", Math.min(limit, PAGINATION.maxLimit).toString());

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        ...API_HEADERS,
        Cookie: `jwt_token=${DUOLINGO_CONFIG.jwtToken}`,
        "x-amzn-trace-id": `User=${DUOLINGO_CONFIG.userId}`,
        baggage:
          "sentry-environment=release,sentry-public_key=cac433b70e6d1d3aad7f46c5e24513e8,sentry-release=com.duolingo.DuolingoMobile%407.85.0%2B7.85.0.2,sentry-sampled=false,sentry-trace_id=ec7398e7272c48a1a6dd50a1abc8b61e,sentry-transaction=LaunchScreenVC",
        "sentry-trace": "ec7398e7272c48a1a6dd50a1abc8b61e-b057bc10c8df4840-0",
      },
      body: JSON.stringify({
        progressedSkills,
        lastTotalLexemeCount,
      }),
    });

    if (!response.ok) {
      throw new Error(`Duolingo API responded with status: ${response.status}`);
    }

    const data: FetchLexemesResponse = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const errorResponse: ApiError = {
      error: "Failed to fetch lexemes",
      details: error instanceof Error ? error.message : "Unknown error",
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
};
