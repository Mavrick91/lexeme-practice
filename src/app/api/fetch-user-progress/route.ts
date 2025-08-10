import { NextResponse } from "next/server";
import type { UserProgressResponse, ApiError } from "@/types/api";
import { DUOLINGO_CONFIG, API_HEADERS } from "@/lib/constants";

export const POST = async () => {
  try {
    const response = await fetch(`${DUOLINGO_CONFIG.apiBaseUrl}/batch`, {
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
        requests: [
          {
            url: `/2023-05-23/users/${DUOLINGO_CONFIG.userId}?fields=adRequestAgeGroup%2CadsConfig%7BallowPersonalizedAds%2Cunits%7D%2CbetaStatus%2Cbio%2CblockedUserIds%2CblockerUserIds%2CclassroomLeaderboardsEnabled%2CcoachOutfit%2Ccourses%7BauthorId%2Ccrowns%2CextraCrowns%2CfromLanguage%2ChealthEnabled%2Cid%2ClearningLanguage%2CplacementTestAvailable%2Csubject%2Ctitle%2Ctopic%2Cxp%7D%2CcreationDate%2CcurrentCourse%7BalphabetsPathProgressKey%2Cassignments%2CauthorId%2CextraCrowns%2CfromLanguage%2CglobalPracticeMetadata%2ChealthEnabled%2Cid%2ClearningLanguage%2ClicensedMusicAccess%2CnumberOfSentences%2CnumberOfWords%2CpathDetails%2CpathExperiments%2CpathSectioned%2CpathTabsSummary%2CplacementTestAvailable%2CprogressVersion%2CscoreMetadata%2Csections%2CsideQuestProgress%2Cskills%7Baccessible%2Cbonus%2Cdecayed%2Cexplanation%2CfinalLevelTimeLimit%2CfinishedLessons%2CfinishedLevels%2Cgrammar%2ChasLevelReview%2CiconId%2Cid%2CindicatingNewContent%2ClastLessonPerfect%2Clessons%2Clevels%2Cname%2CprogressRemaining%2CshortName%2CurlName%7D%2CsmartTips%2Cstatus%2Csubject%2Ctitle%2Ctopic%2CtrackingProperties%2CtreeId%2CwordsLearned%2Cxp%7D%2Cemail%2CemailAnnouncement%2CemailFollow%2CemailPass%2CemailPromotion%2CemailResearch%2CemailStreakFreezeUsed%2CemailUniversalPractice%2CemailWeeklyProgressReport%2CenableMicrophone%2CenableSoundEffects%2CenableSpeaker%2CenergyConfig%2CfacebookId%2CfeedbackProperties%2CfirstName%2CfromLanguage%2Cgems%2CgemsConfig%2CgoogleId%2ChasRecentActivity15%2Chealth%2Cid%2CinviteURL%2CjoinedClassroomIds%2CkudosOffers%2CkudosReceived%2ClastName%2ClastResurrectionTimestamp%2ClearningLanguage%2Clingots%2CliteracyAdGroup%2Clocation%2ClssEnabled%2Cmotivation%2Cname%2CobservedClassroomIds%2CoptionalFeatures%2CpersistentNotifications%2CphoneNumber%2Cpicture%2CplusDiscounts%2CprivacySettings%2CprofileCountry%2CpushAnnouncement%2CpushEarlyBird%2CpushFamilyPlanNudge%2CpushFollow%2CpushFriendStreakNudge%2CpushFriendsQuestNudge%2CpushLeaderboards%2CpushNightOwl%2CpushPassed%2CpushPromotion%2CpushResurrectRewards%2CpushSchoolsAssignment%2CpushStreakFreezeUsed%2CpushStreakSaver%2CpushUniversalPractice%2CreferralInfo%2CrequiresParentalConsent%2CrewardBundles%2Croles%2CsessionCount%2CshakeToReportEnabled%2CshopItems%7BexpectedExpirationDate%2CfamilyPlanInfo%7BfamilyPlanUpgradeNudge%7BeventTimestamp%2CreceiverId%2CsenderId%2Ctracking%7D%2CimmersiveFamilyPlanInfo%7Bexpiration%7D%2CinviteToken%2CownerId%2CpendingInviteSuggestions%7BfromUserId%2CsentTime%2Cstatus%2CtoUserId%7D%2CpendingInvites%7BfromUserId%2CsentTime%2Cstatus%2CtoUserId%7D%2CsecondaryMembers%7D%2Cid%2CpurchaseDate%2CpurchasePrice%2CpurchasedByUserId%2Cquantity%2CsubscriptionInfo%7BexpectedExpiration%2CisFreeTrialPeriod%2CisInBillingRetryPeriod%2CproductId%2CpromotionalOfferId%2Crenewer%2Crenewing%2CrenewingType%2Ctier%2Ctype%7D%2CxpBoostMultiplier%7D%2CshouldForceConnectPhoneNumber%2CshouldPreventMonetizationForSchoolsUser%2CsmsAll%2CstateNeedsTOS%2CstreakData%7Blength%2CupdatedTimeZone%2CupdatedTimestamp%2CxpGoal%7D%2CstudentPlanPromoGroup%2CsubscriberLevel%2CsubscriptionConfigs%2CtimerBoostConfig%2Ctimezone%2CtotalXp%2CtrackingProperties%2CuniversalPracticeNotifyTime%2CuseUniversalSmartReminderTime%2Cusername%2CxpGains%7BeventType%2CskillId%2Ctime%2C%20xp%7D%2CzhTw`,
            body: "",
            method: "GET",
            extraHeaders: {},
          },
        ],
        includeHeaders: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Duolingo API responded with status: ${response.status}`);
    }

    const data: UserProgressResponse = await response.json();

    // Process each response in the batch
    if (data.responses && Array.isArray(data.responses)) {
      data.responses = data.responses.map((res) => {
        // Parse the response body if it's a JSON string
        if (res.body && typeof res.body === "string") {
          try {
            res.body = JSON.parse(res.body);
          } catch {
            // Keep as string if not valid JSON
          }
        }
        return res;
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    const errorResponse: ApiError = {
      error: "Failed to fetch user progress",
      details: error instanceof Error ? error.message : "Unknown error",
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
};
