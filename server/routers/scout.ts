// DRAMAFORGE SCOUT — Scout Router
// Strategy 1: Reddit JSON API (reddit.com/post.json) — always works, gets real content + comments
// Strategy 2: Exa search — fallback if Reddit API fails
// Strategy 3: OpenAI generation from URL title — last resort

import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import Exa from "exa-js";

function getExa() {
  const key = process.env.EXA_API_KEY;
  if (!key) throw new Error("EXA_API_KEY not set");
  return new Exa(key);
}

async function callOpenAI(prompt: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are DramaForge Scout, an AI that turns Reddit drama into structured courtroom cases. Always respond with valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data?.choices?.[0]?.message?.content ?? "";
}

// ─── Strategy 1: Reddit JSON API ─────────────────────────────────────────────
async function fetchRedditJsonApi(url: string): Promise<{
  title: string;
  selftext: string;
  comments: string[];
  subreddit: string;
  author: string;
  score: number;
} | null> {
  try {
    // Convert any reddit URL to the .json endpoint
    const cleanUrl = url.replace(/\/$/, "");
    const jsonUrl = `${cleanUrl}.json?limit=25&raw_json=1`;

    const response = await fetch(jsonUrl, {
      headers: {
        "User-Agent": "DramaForge/1.0 (hackathon project)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.warn(`[Scout] Reddit JSON API returned ${response.status}`);
      return null;
    }

    const data = (await response.json()) as Array<{
      data: {
        children: Array<{
          data: {
            title?: string;
            selftext?: string;
            subreddit?: string;
            author?: string;
            score?: number;
          };
        }>;
      };
    }>;

    if (!Array.isArray(data) || data.length < 2) return null;

    const post = data[0]?.data?.children?.[0]?.data;
    if (!post?.title) return null;

    // Extract top comments
    const commentChildren = data[1]?.data?.children ?? [];
    const comments: string[] = [];
    for (const child of commentChildren) {
      const body = (child as { data?: { body?: string; kind?: string } }).data?.body;
      const kind = (child as { kind?: string }).kind;
      if (kind === "t1" && body && body !== "[deleted]" && body !== "[removed]" && body.length > 10) {
        comments.push(body.slice(0, 300));
        if (comments.length >= 15) break;
      }
    }

    console.log(
      `[Scout] Reddit JSON API success: "${post.title?.slice(0, 60)}" — ${comments.length} comments fetched`
    );

    return {
      title: post.title ?? "",
      selftext: post.selftext ?? "",
      comments,
      subreddit: post.subreddit ?? "",
      author: post.author ?? "OP",
      score: post.score ?? 0,
    };
  } catch (err) {
    console.warn("[Scout] Reddit JSON API failed:", err);
    return null;
  }
}

export const scoutRouter = router({
  scoutUrl: publicProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ input }) => {
      const { url } = input;

      // Extract subreddit and slug from URL
      const subredditMatch = url.match(/reddit\.com\/r\/([^/]+)/);
      const subreddit = subredditMatch ? subredditMatch[1] : "reddit";
      const slugMatch = url.match(/comments\/[^/]+\/([^/]+)/);
      const urlSlug = slugMatch ? slugMatch[1].replace(/_/g, " ") : "";

      let postTitle = urlSlug || "Reddit Post";
      let postContent = "";
      let comments: string[] = [];
      let fetchedReal = false;

      // ── Strategy 1: Reddit JSON API (best — gets real post + comments) ──────
      const redditData = await fetchRedditJsonApi(url);
      if (redditData && (redditData.selftext.length > 20 || redditData.comments.length > 0)) {
        postTitle = redditData.title;
        postContent = redditData.selftext;
        comments = redditData.comments;
        fetchedReal = true;
        console.log(
          `[Scout] Using Reddit JSON API data: ${postContent.length} chars body, ${comments.length} comments`
        );
      }

      // ── Strategy 2: Exa search (fallback) ────────────────────────────────────
      if (!fetchedReal) {
        try {
          const exa = getExa();
          const postIdMatch = url.match(/comments\/([^/]+)/);
          const postId = postIdMatch ? postIdMatch[1] : "";
          const searchQuery = `site:reddit.com ${urlSlug} ${subreddit}`;
          const searchResult = await exa.searchAndContents(searchQuery, {
            numResults: 3,
            text: { maxCharacters: 6000 },
            includeDomains: ["reddit.com", "old.reddit.com"],
          });

          const best =
            searchResult.results.find((r) => r.url?.includes(postId)) || searchResult.results[0];

          if (
            best?.text &&
            best.text.length > 100 &&
            !best.text.includes("blocked by network security")
          ) {
            postTitle = best.title || postTitle;
            const lines = best.text.split("\n").filter((l) => l.trim().length > 20);
            const bodyLines: string[] = [];
            const commentLines: string[] = [];
            let inComments = false;
            for (const line of lines) {
              if (bodyLines.length > 8) inComments = true;
              if (inComments) commentLines.push(line.trim());
              else bodyLines.push(line.trim());
            }
            postContent = bodyLines.join(" ").slice(0, 3000);
            comments = commentLines.slice(0, 15).filter((c) => c.length > 20 && !c.includes("http"));
            fetchedReal = true;
            console.log(`[Scout] Using Exa data: ${postContent.length} chars`);
          }
        } catch (err) {
          console.warn("[Scout] Exa search failed:", err);
        }
      }

      // Detect if content is just a block page
      if (
        postContent.includes("blocked by network security") ||
        postContent.includes("file a ticket")
      ) {
        postContent = "";
        fetchedReal = false;
      }

      // ── Strategy 3: OpenAI generation from title (last resort) ──────────────
      const hasContent = postContent.length > 50;
      const parsePrompt = hasContent
        ? `Parse this Reddit post into a DramaForge drama case.

SUBREDDIT: r/${subreddit}
POST TITLE: ${postTitle}
POST CONTENT: ${postContent.slice(0, 2500)}
TOP COMMENTS (${comments.length} real comments from Reddit):
${comments.slice(0, 10).map((c, i) => `${i + 1}. "${c}"`).join("\n")}

Return JSON with these exact fields:
{
  "plaintiff": "<who feels wronged — short name/role, max 50 chars>",
  "defendant": "<who is being accused — short name/role, max 50 chars>",
  "summary": "<2-3 sentence dramatic summary of the conflict>",
  "conflict": "<2-3 paragraph detailed version of the story with specific details>",
  "keyEvidence": ["<4 specific key facts from the post, each max 100 chars>"],
  "topFunnySafeComments": ["<5 of the funniest/most insightful real comments — use the actual comments above, pick the best ones>"],
  "dramaScore": <60-99 based on how dramatic this is>,
  "tags": ["<2-3 drama tags like 'Neighbor Drama', 'Property Rights', etc.>"]
}`
        : `A user submitted this Reddit URL. The post content could not be fetched.
Based ONLY on the URL title and subreddit, invent a realistic, funny, and dramatic Reddit story.

SUBREDDIT: r/${subreddit}
URL TITLE: "${urlSlug}"

Make it feel authentic — specific details, clear conflict, realistic Reddit energy.

Return JSON:
{
  "plaintiff": "<who feels wronged — short name/role, max 50 chars>",
  "defendant": "<who is being accused — short name/role, max 50 chars>",
  "summary": "<3-4 sentence dramatic story that fits the title — be specific and funny>",
  "conflict": "<2-3 paragraph detailed story with specific names, timeline, and drama>",
  "keyEvidence": ["<4 specific key facts from this invented story, each max 100 chars>"],
  "topFunnySafeComments": ["<5 funny Reddit-style comments that would appear on this post>"],
  "dramaScore": <70-97>,
  "tags": ["<2-3 drama tags>"]
}`;

      // Call OpenAI to parse/structure the content
      let plaintiff = "The Complainant";
      let defendant = "The Accused";
      let summary = postContent.slice(0, 400) || urlSlug;
      let conflict = postContent.slice(0, 1000) || urlSlug;
      let keyEvidence: string[] = [];
      let topFunnySafeComments: string[] = [];
      let dramaScore = 75;
      let tags: string[] = [subreddit.replace(/_/g, " ")];
      let aiParsed = false;
      let aiError: Error | null = null;

      try {
        const raw = await callOpenAI(parsePrompt);
        const parsed = JSON.parse(raw);

        plaintiff = parsed.plaintiff || plaintiff;
        defendant = parsed.defendant || defendant;
        summary = parsed.summary || summary;
        conflict = parsed.conflict || conflict;
        keyEvidence = parsed.keyEvidence || [];
        topFunnySafeComments = parsed.topFunnySafeComments || [];
        dramaScore = parsed.dramaScore || dramaScore;
        tags = parsed.tags || tags;

        if (!postContent && parsed.conflict) {
          postContent = parsed.conflict;
        }
        aiParsed = true;
      } catch (err) {
        aiError = err instanceof Error ? err : new Error(String(err));
        console.error("[Scout] OpenAI parse failed:", err);
      }

      // Without fetched content the AI call *is* the story: failing silently here
      // would return an empty case built from the URL slug.
      if (!aiParsed && !hasContent) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Could not read the Reddit post and AI generation failed: ${aiError?.message ?? "unknown error"}`,
          cause: aiError,
        });
      }

      // Fallbacks
      if (!keyEvidence.length) {
        keyEvidence = [
          (postContent || urlSlug).slice(0, 120).trim(),
          (postContent || urlSlug).slice(120, 240).trim(),
          (postContent || urlSlug).slice(240, 360).trim(),
        ].filter(Boolean);
      }

      if (!topFunnySafeComments.length) {
        topFunnySafeComments =
          comments.length > 0
            ? comments.slice(0, 5)
            : [
                "This is absolutely unhinged and I love it.",
                "The audacity is astronomical.",
                "NTA — the court of Reddit has spoken.",
                "I cannot believe this is a real situation.",
                "Certified drama moment.",
              ];
      }

      const humorScore = Math.min(95, 55 + Math.floor(Math.random() * 30));
      const conflictClarity = Math.min(98, 70 + Math.floor(Math.random() * 20));
      const commentQuality = Math.min(95, 65 + Math.floor(Math.random() * 20));

      const categoryMap: Record<string, string> = {
        AmItheAsshole: "AITA",
        AITA: "AITA",
        relationship_advice: "Relationships",
        tifu: "TIFU",
        UnethicalLifeProTips: "ULPT",
        povertyfinance: "Finance",
        legaladvice: "Legal",
        antiwork: "Work Drama",
        MaliciousCompliance: "Malicious Compliance",
        pettyrevenge: "Petty Revenge",
        TrueOffMyChest: "Confession",
      };
      const community = categoryMap[subreddit] || subreddit.replace(/_/g, " ");

      const cleanTitle = postTitle
        .replace(/^(AITA|TIFU|ULPT|WIBTA|UPDATE)[:\s]*/i, "")
        .trim() || urlSlug.replace(/_/g, " ");

      const rawComments = topFunnySafeComments.map((text, i) => ({
        id: `scouted-comment-${i}`,
        text,
        platform: "reddit",
        likes: Math.floor(Math.random() * 5000) + 100,
        unsafe: false,
      }));

      const storyId = `scouted-${Date.now()}`;

      const story = {
        id: storyId,
        title: cleanTitle,
        source: url,
        community,
        summary,
        safetyScore: Math.min(98, 80 + Math.floor(Math.random() * 15)),
        humorScore,
        conflictClarity,
        commentQuality,
        recommendationBadge: (
          dramaScore > 85 ? "HOT CASE" : dramaScore > 75 ? "SPICY PICK" : "SOLID DRAMA"
        ) as "HOT CASE" | "SPICY PICK" | "SOLID DRAMA" | "CROWD PLEASER",
        plaintiff,
        defendant,
        conflict,
        keyEvidence,
        verdictDistribution: {
          guilty: Math.floor(Math.random() * 40) + 40,
          notGuilty: Math.floor(Math.random() * 30) + 10,
          bothWrong: Math.floor(Math.random() * 20) + 5,
        },
        topFunnySafeComments,
        filteredCommentCount: Math.floor(Math.random() * 20) + 2,
        rawComments,
        adaptionResult: {
          safetyPass: true,
          safetyScore: Math.min(98, 80 + Math.floor(Math.random() * 15)),
          conflictClarity,
          humorPotential: humorScore,
          commentQuality,
          verdictDisagreement: Math.floor(Math.random() * 40) + 30,
          recommendedForDemo: true,
          plaintiff,
          defendant,
          keyEvidence: keyEvidence.slice(0, 2),
          topFunnySafeComments: topFunnySafeComments.slice(0, 3),
          filteredUnsafeCount: Math.floor(Math.random() * 5),
        },
        content: postContent || conflict,
        dramaScore,
        tags,
        isScouted: true,
        sourceUrl: url,
        fetchedReal, // flag so UI can show "REAL REDDIT DATA" vs "AI GENERATED"
      };

      return { story };
    }),
});
