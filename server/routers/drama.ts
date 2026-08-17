// DRAMAFORGE SCOUT — Drama Router
// Handles fal.ai Seedance 2.0 video generation + ElevenLabs TTS + DB reel caching
// Video model: LTX 2.3 Fast text-to-video via fal.ai
// Prompts: Gemini-generated 4-layer Seedance prompts, theme-aware

import { z } from "zod";
import { eq } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import { getDb } from "../db";
import { reelCache } from "../../drizzle/schema";
import { fal } from "@fal-ai/client";

// ─── Theme visual style map ───────────────────────────────────────────────────
const THEME_STYLES: Record<string, {
  visualStyle: string;
  cameraStyle: string;
  audioStyle: string;
  colorPalette: string;
}> = {
  "anime-battle": {
    visualStyle: "anime art style, bold black outlines, vibrant cel-shading, speed lines on impact moments, manga panel composition, OBJECTION energy, dramatic power-up auras, Shonen anime aesthetic",
    cameraStyle: "dynamic Dutch angles, rapid zoom-ins, dramatic close-ups, manga panel cuts",
    audioStyle: "dramatic anime orchestral sting, crowd gasps, electric crackle SFX, gavel slam",
    colorPalette: "electric red and gold on deep navy, high contrast, saturated colors",
  },
  "tamil-masala": {
    visualStyle: "Tamil masala film style, Kollywood aesthetic, over-the-top dramatic flair, slow-motion hero entry, background dancers, flower petals, dramatic wind effects",
    cameraStyle: "slow-motion reveals, 360-degree hero shots, dramatic freeze frames, intense close-ups",
    audioStyle: "Tamil film background score swelling dramatically, crowd cheering, dramatic music sting",
    colorPalette: "warm golden tones, vibrant saris, jewel tones, dramatic sunset lighting",
  },
  "netflix-crime": {
    visualStyle: "Netflix true crime documentary style, desaturated cinematic look, evidence close-ups, ominous atmosphere, photorealistic, 4K documentary aesthetic",
    cameraStyle: "handheld documentary camera, slow push-ins, evidence board reveals, interview framing",
    audioStyle: "ominous true crime score, ambient tension, clock ticking, paper rustling",
    colorPalette: "desaturated blues and grays, harsh overhead lighting, cold clinical tones",
  },
  "judge-judy": {
    visualStyle: "daytime TV courtroom show style, bright studio lighting, American courtroom aesthetic, no-nonsense energy, TV show production quality",
    cameraStyle: "static TV camera angles, reaction shot cuts, dramatic zoom on judge",
    audioStyle: "courtroom TV show music, audience reactions, gavel banging, dramatic stings",
    colorPalette: "warm studio lighting, wood paneling, American flag, bright and clear",
  },
  "corporate-hr": {
    visualStyle: "corporate office aesthetic, fluorescent lighting, PowerPoint presentation energy, passive-aggressive professionalism, stock photo vibes, LinkedIn energy",
    cameraStyle: "static corporate video framing, awkward zoom calls, conference room angles",
    audioStyle: "elevator music, awkward silence, keyboard typing, notification pings",
    colorPalette: "corporate blues and grays, beige walls, motivational poster colors",
  },
  "bbc-doc": {
    visualStyle: "BBC documentary style, British aesthetic, measured and understated, high production value, historical gravitas, photorealistic cinematic quality",
    cameraStyle: "steady documentary shots, slow pans, thoughtful close-ups, archival feel",
    audioStyle: "BBC orchestral score, measured narration tone, ambient room sound, understated drama",
    colorPalette: "muted British tones, overcast lighting, deep greens and browns, dignified palette",
  },
};

const DEFAULT_THEME_STYLE = THEME_STYLES["anime-battle"];

// ─── In-memory job store for progress tracking ───────────────────────────────
type SceneStatus = "queued" | "generating" | "done" | "error";
type JobScene = {
  id: string;
  title: string;
  status: SceneStatus;
  videoUrl: string | null;
  audioUrl: string | null;
  mediaType?: "video" | "image"; // Track whether videoUrl is a video or image
  narration?: string;
  speakerRole?: string;
  error?: string;
};
type Job = {
  id: string;
  storyId: string;
  total: number;
  completed: number;
  scenes: JobScene[];
  status: "running" | "done" | "error";
  startedAt: number;
};

const jobs = new Map<string, Job>();

// ─── OpenAI theme-aware scene prompt generator ─────────────────────────────────
async function generateSeedancePrompt(
  scene: { id: string; title: string; narration: string; speakerRole: string },
  storyContext: { title: string; summary: string; plaintiff: string; defendant: string },
  themeId: string,
  _unused?: string
): Promise<string> {
  const theme = THEME_STYLES[themeId] || DEFAULT_THEME_STYLE;

  const systemPrompt = `You are an elite anime director and prompt engineer for high-end cinematic video generation models (such as LTX-2.3, Kling, and AnimateDiff). 
Your prompts must produce breathtaking, highly stylized, coherent manga motion comic visuals with zero gibberish.

Core Prompt Rules for Video Generation:
1. Subject & Core Action: Define the primary character, pose, intense expression, and motion clearly in the opening clause.
2. Art Direction & Theme: Incorporate bold manga lines, vibrant cel-shading, dynamic speed lines, and cinematic lighting matching the chosen theme.
3. Environment & Atmosphere: Describe the courtroom setting, volumetric light rays, golden scales of justice, and dramatic background depth.
4. Camera & Composition: Specify cinematic framing (e.g. Dutch angle, dramatic close-up, manga split-panel composition, 16:9 widescreen).
5. Style Keywords: High contrast, masterwork, crisp line art, professional anime production keyframe.
Keep the prompt under 150 words, rich in visual nouns and cinematic descriptors, and free of meta-instructions.`;

  const userPrompt = `Create a masterwork video generation prompt for this scene:

STORY: ${storyContext.title}
STORY SUMMARY: ${storyContext.summary}
SCENE: ${scene.title}
NARRATION: ${scene.narration}
SPEAKER: ${scene.speakerRole}
THEME STYLE: ${theme.visualStyle}
CAMERA: ${theme.cameraStyle}
PALETTE: ${theme.colorPalette}

Write a vivid, highly coherent visual prompt that captures the intensity of this courtroom drama moment in 16:9 widescreen anime style. Return ONLY the final prompt text.`;

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    // Fallback to simple prompt if no OpenAI key
    return `${scene.narration}, ${theme.visualStyle}, ${theme.colorPalette}, cinematic 16:9, 5 seconds`;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.9,
      max_tokens: 600,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.warn(`[Drama] OpenAI prompt generation failed: ${response.status} ${err.slice(0, 100)}`);
    return `${scene.narration}, ${theme.visualStyle}, ${theme.colorPalette}, cinematic 16:9, 5 seconds`;
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data?.choices?.[0]?.message?.content ?? "";
  return text.trim() || `${scene.narration}, ${theme.visualStyle}, 16:9, 5 seconds`;
}

// ─── LTX 2.3 Fast video generation via fal.ai SDK ───────────────────────────
async function generateVideo(prompt: string, falApiKey: string): Promise<string> {
  fal.config({ credentials: falApiKey });

  const result = await fal.run("fal-ai/ltx-2.3/text-to-video/fast", {
    input: {
      prompt,
      duration: "6",
      resolution: "1080p",
      aspect_ratio: "16:9",
      fps: "24",
      generate_audio: false,
    },
  }) as { video?: { url?: string } };

  const videoUrl = result?.video?.url;
  if (!videoUrl) throw new Error(`LTX 2.3 Fast returned no video URL: ${JSON.stringify(result)}`);
  return videoUrl;
}

// ─── fal.ai image generation (fallback if Seedance fails) ────────────────────
async function generateFallbackImage(prompt: string, falApiKey: string): Promise<string> {
  fal.config({ credentials: falApiKey });
  const result = await fal.run("fal-ai/flux/schnell", {
    input: {
      prompt: `${prompt}, high quality, cinematic, anime style`,
      image_size: "landscape_16_9",
      num_inference_steps: 4,
      num_images: 1,
    },
  }) as { images?: Array<{ url?: string }> };
  const imageUrl = result?.images?.[0]?.url;
  if (!imageUrl) throw new Error(`fal.ai returned no image URL: ${JSON.stringify(result)}`);
  return imageUrl;
}

// ─── ElevenLabs TTS ──────────────────────────────────────────────────────────
async function generateVoice(text: string, elevenLabsKey: string, voiceId: string): Promise<Buffer> {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": elevenLabsKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`ElevenLabs error: ${response.status} ${err}`);
  }

  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
}

const VOICE_IDS: Record<string, string> = {
  Judge:     "JBFqnCBsd6RMkjVDRZzb",
  Plaintiff: "EXAVITQu4vr4xnSDxMaL",
  Defendant: "TxGEqnHWrfWFTfGW9XjX",
  Witness:   "ThT5KcBeYPX3keUQqHPh",
  Narrator:  "pNInz6obpgDQGcFmaJgB",
};

// ─── Background job runner ────────────────────────────────────────────────────
async function runReelJob(
  jobId: string,
  storyId: string,
  storyTitle: string,
  storyContext: { summary: string; plaintiff: string; defendant: string },
  scenes: Array<{ id: string; title: string; prompt: string; narration: string; speakerRole: string }>,
  themeId: string,
  falKey: string | undefined,
  elevenKey: string | undefined,
  _unusedKey?: string
) {
  const job = jobs.get(jobId)!;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const jobScene = job.scenes[i];
    jobScene.status = "generating";

    try {
      // Step 1: Generate OpenAI-powered Seedance prompt (theme-aware)
      let videoPrompt = scene.prompt;
      try {
        videoPrompt = await generateSeedancePrompt(
          scene,
          { title: storyTitle, summary: storyContext.summary, plaintiff: storyContext.plaintiff, defendant: storyContext.defendant },
          themeId
        );
        console.log(`[Job ${jobId}] Scene ${i + 1} OpenAI prompt: ${videoPrompt.slice(0, 100)}...`);
      } catch (err) {
        console.warn(`[Job ${jobId}] OpenAI prompt gen failed, using fallback:`, err);
      }

      const [videoResult, audioResult] = await Promise.allSettled([
        falKey ? (async () => {
          try {
            return { url: await generateVideo(videoPrompt, falKey), isVideo: true };
          } catch (videoErr) {
            console.warn(`[Job ${jobId}] Video generation failed, falling back to image:`, videoErr);
            return { url: await generateFallbackImage(videoPrompt, falKey), isVideo: false };
          }
        })() : Promise.resolve(null),

        elevenKey ? (async () => {
          const voiceId = VOICE_IDS[scene.speakerRole] || VOICE_IDS.Narrator;
          const buf = await generateVoice(scene.narration, elevenKey, voiceId);
          const { url } = await storagePut(
            `drama-audio/${storyId}/${scene.id}.mp3`,
            buf,
            "audio/mpeg"
          );
          return url;
        })() : Promise.resolve(null),
      ]);

      let videoUrl: string | null = null;
      if (videoResult.status === "fulfilled" && videoResult.value) {
        try {
          const mediaUrl = videoResult.value.url;
          const mediaRes = await fetch(mediaUrl);
          const buf = Buffer.from(await mediaRes.arrayBuffer());
          const contentType = videoResult.value.isVideo ? "video/mp4" : "image/jpeg";
          const ext = videoResult.value.isVideo ? "mp4" : "jpg";
          const { url } = await storagePut(
            `drama-scenes/${storyId}/${scene.id}.${ext}`,
            buf,
            contentType
          );
          videoUrl = url;
        } catch {
          videoUrl = videoResult.value.url;
        }
      }

      jobScene.videoUrl = videoUrl;
      jobScene.mediaType = videoResult.status === "fulfilled" && videoResult.value?.isVideo ? "video" : "image";
      jobScene.audioUrl = audioResult.status === "fulfilled" ? audioResult.value : null;
      jobScene.status = "done";
      job.completed++;

      console.log(`[Job ${jobId}] Scene ${i + 1}/${scenes.length} done: ${scene.id} video=${!!videoUrl} audio=${!!jobScene.audioUrl}`);
    } catch (err) {
      jobScene.status = "error";
      jobScene.error = err instanceof Error ? err.message : String(err);
      job.completed++;
      console.error(`[Job ${jobId}] Scene ${scene.id} failed:`, err);
    }
  }

  job.status = "done";
  console.log(`[Job ${jobId}] Complete for story: ${storyTitle} (theme: ${themeId})`);

  // Persist completed reel to DB cache (keyed by storyId + themeId)
  try {
    const db = await getDb();
    if (db) {
      const completedScenes = scenes.map((s, i) => ({
        id: s.id,
        title: s.title,
        narration: s.narration,
        speakerRole: s.speakerRole,
        videoUrl: job.scenes[i].videoUrl,
        audioUrl: job.scenes[i].audioUrl,
      }));

      const cacheKey = `${storyId}::${themeId}`;
      await db.insert(reelCache).values({
        storyId: cacheKey,
        storyTitle,
        scenes: completedScenes,
        sceneCount: completedScenes.length,
      }).onDuplicateKeyUpdate({
        set: {
          scenes: completedScenes,
          sceneCount: completedScenes.length,
        },
      });
      console.log(`[Job ${jobId}] Reel cached to DB for key: ${cacheKey}`);
    }
  } catch (err) {
    console.error(`[Job ${jobId}] Failed to cache reel to DB:`, err);
  }

  // Clean up job after 10 minutes
  setTimeout(() => jobs.delete(jobId), 10 * 60 * 1000);
}

export const dramaRouter = router({
  // Check if a reel is already cached for this story + theme combo
  getReelCache: publicProcedure
    .input(z.object({
      storyId: z.string(),
      themeId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) return null;
        // Try theme-specific cache first, then fall back to storyId-only
        const cacheKey = input.themeId ? `${input.storyId}::${input.themeId}` : input.storyId;
        const rows = await db.select().from(reelCache).where(eq(reelCache.storyId, cacheKey)).limit(1);
        if (!rows.length && input.themeId) {
          // Fall back to storyId-only cache (from before theme support)
          const fallbackRows = await db.select().from(reelCache).where(eq(reelCache.storyId, input.storyId)).limit(1);
          if (!fallbackRows.length) return null;
          const row = fallbackRows[0];
          return {
            storyId: row.storyId,
            storyTitle: row.storyTitle,
            sceneCount: row.sceneCount,
            scenes: row.scenes as Array<{
              id: string; title: string; narration: string; speakerRole: string;
              videoUrl: string | null; audioUrl: string | null; mediaType?: "video" | "image";
            }>,
            createdAt: row.createdAt,
          };
        }
        if (!rows.length) return null;
        const row = rows[0];
        return {
          storyId: row.storyId,
          storyTitle: row.storyTitle,
          sceneCount: row.sceneCount,
          scenes: row.scenes as Array<{
            id: string; title: string; narration: string; speakerRole: string;
            videoUrl: string | null; audioUrl: string | null; mediaType?: "video" | "image";
          }>,
          createdAt: row.createdAt,
        };
      } catch {
        return null;
      }
    }),

  // Start a background reel generation job — returns jobId immediately
  startReelJob: publicProcedure
    .input(z.object({
      storyId: z.string(),
      storyTitle: z.string(),
      storyContext: z.object({
        summary: z.string(),
        plaintiff: z.string(),
        defendant: z.string(),
      }),
      themeId: z.string().default("anime-battle"),
      scenes: z.array(z.object({
        id: z.string(),
        title: z.string(),
        prompt: z.string(),
        narration: z.string(),
        speakerRole: z.string(),
      })),
    }))
    .mutation(async ({ input }) => {
      const falKey = process.env.FAL_API_KEY;
      const elevenKey = process.env.ELEVENLABS_API_KEY;
      const geminiKey = process.env.GEMINI_API_KEY;

      const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const job: Job = {
        id: jobId,
        storyId: input.storyId,
        total: input.scenes.length,
        completed: 0,
        status: "running",
        startedAt: Date.now(),
        scenes: input.scenes.map(s => ({
          id: s.id,
          title: s.title,
          narration: s.narration,
          speakerRole: s.speakerRole,
          status: "queued" as SceneStatus,
          videoUrl: null,
          audioUrl: null,
        })),
      };

      jobs.set(jobId, job);

      runReelJob(
        jobId,
        input.storyId,
        input.storyTitle,
        input.storyContext,
        input.scenes,
        input.themeId,
        falKey,
        elevenKey,
        geminiKey
      ).catch(err => console.error(`[Job ${jobId}] Unexpected error:`, err));

      return { jobId, total: input.scenes.length };
    }),

  // Poll job progress — call every 2s from frontend
  getJobProgress: publicProcedure
    .input(z.object({ jobId: z.string() }))
    .query(({ input }) => {
      const job = jobs.get(input.jobId);
      if (!job) return null;

      return {
        jobId: job.id,
        status: job.status,
        total: job.total,
        completed: job.completed,
        percent: Math.round((job.completed / job.total) * 100),
        elapsedMs: Date.now() - job.startedAt,
        scenes: job.scenes.map(s => ({
          id: s.id,
          title: s.title,
          status: s.status,
          videoUrl: s.videoUrl,
          audioUrl: s.audioUrl,
          mediaType: s.mediaType,
          error: s.error,
        })),
      };
    }),
});
