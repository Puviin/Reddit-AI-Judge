// DRAMAFORGE SCOUT — Drama Router
// Handles fal.ai video generation + ElevenLabs TTS + DB reel caching
// Confirmed working endpoints:
//   Video: fal-ai/fast-animatediff/text-to-video  ✓ (num_frames max=32)
//   Image: fal-ai/flux/schnell                     ✓ (fallback)
//   Audio: ElevenLabs TTS                          ✓

import { z } from "zod";
import { eq } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import { getDb } from "../db";
import { reelCache } from "../../drizzle/schema";

// ─── In-memory job store for progress tracking ───────────────────────────────
type SceneStatus = "queued" | "generating" | "done" | "error";
type JobScene = {
  id: string;
  title: string;
  status: SceneStatus;
  videoUrl: string | null;
  audioUrl: string | null;
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

// ─── fal.ai video generation ─────────────────────────────────────────────────
async function generateMangaVideoScene(prompt: string, falApiKey: string): Promise<string> {
  const response = await fetch("https://fal.run/fal-ai/fast-animatediff/text-to-video", {
    method: "POST",
    headers: {
      "Authorization": `Key ${falApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: `${prompt}, anime style, manga, high quality, cinematic`,
      num_frames: 32,  // max allowed is 32
      fps: 8,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`fal.ai video error: ${response.status} ${err}`);
  }

  const data = await response.json() as { video?: { url?: string } };
  const videoUrl = data?.video?.url;
  if (!videoUrl) throw new Error(`fal.ai returned no video URL: ${JSON.stringify(data)}`);
  return videoUrl;
}

// ─── fal.ai image generation (fallback) ──────────────────────────────────────
async function generateMangaImageScene(prompt: string, falApiKey: string): Promise<string> {
  const response = await fetch("https://fal.run/fal-ai/flux/schnell", {
    method: "POST",
    headers: {
      "Authorization": `Key ${falApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: `${prompt}, anime manga style, dramatic lighting, high contrast, cinematic`,
      image_size: "landscape_16_9",
      num_inference_steps: 4,
      num_images: 1,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`fal.ai image error: ${response.status} ${err}`);
  }

  const data = await response.json() as { images?: Array<{ url?: string }> };
  const imageUrl = data?.images?.[0]?.url;
  if (!imageUrl) throw new Error(`fal.ai returned no image URL: ${JSON.stringify(data)}`);
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
  scenes: Array<{ id: string; title: string; prompt: string; narration: string; speakerRole: string }>,
  falKey: string | undefined,
  elevenKey: string | undefined
) {
  const job = jobs.get(jobId)!;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const jobScene = job.scenes[i];
    jobScene.status = "generating";

    try {
      const [videoResult, audioResult] = await Promise.allSettled([
        falKey ? (async () => {
          try {
            return await generateMangaVideoScene(scene.prompt, falKey);
          } catch {
            return await generateMangaImageScene(scene.prompt, falKey);
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
          const mediaUrl = videoResult.value;
          const mediaRes = await fetch(mediaUrl);
          const buf = Buffer.from(await mediaRes.arrayBuffer());
          const isVideo = mediaUrl.includes(".mp4") || mediaUrl.includes("video");
          const contentType = isVideo ? "video/mp4" : "image/jpeg";
          const ext = isVideo ? "mp4" : "jpg";
          const { url } = await storagePut(
            `drama-scenes/${storyId}/${scene.id}.${ext}`,
            buf,
            contentType
          );
          videoUrl = url;
        } catch {
          videoUrl = videoResult.value;
        }
      }

      jobScene.videoUrl = videoUrl;
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
  console.log(`[Job ${jobId}] Complete for story: ${storyTitle}`);

  // Persist completed reel to DB cache
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

      await db.insert(reelCache).values({
        storyId,
        storyTitle,
        scenes: completedScenes,
        sceneCount: completedScenes.length,
      }).onDuplicateKeyUpdate({
        set: {
          scenes: completedScenes,
          sceneCount: completedScenes.length,
        },
      });
      console.log(`[Job ${jobId}] Reel cached to DB for storyId: ${storyId}`);
    }
  } catch (err) {
    console.error(`[Job ${jobId}] Failed to cache reel to DB:`, err);
  }

  // Clean up job after 10 minutes
  setTimeout(() => jobs.delete(jobId), 10 * 60 * 1000);
}

export const dramaRouter = router({
  // Check if a reel is already cached for this story
  getReelCache: publicProcedure
    .input(z.object({ storyId: z.string() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) return null;
        const rows = await db.select().from(reelCache).where(eq(reelCache.storyId, input.storyId)).limit(1);
        if (!rows.length) return null;
        const row = rows[0];
        return {
          storyId: row.storyId,
          storyTitle: row.storyTitle,
          sceneCount: row.sceneCount,
          scenes: row.scenes as Array<{
            id: string; title: string; narration: string; speakerRole: string;
            videoUrl: string | null; audioUrl: string | null;
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

      runReelJob(jobId, input.storyId, input.storyTitle, input.scenes, falKey, elevenKey).catch(
        err => console.error(`[Job ${jobId}] Unexpected error:`, err)
      );

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
          error: s.error,
        })),
      };
    }),

  // Legacy: generate all at once (kept for backward compat)
  generateDramaReel: publicProcedure
    .input(z.object({
      storyId: z.string(),
      storyTitle: z.string(),
      scenes: z.array(z.object({
        id: z.string(),
        prompt: z.string(),
        narration: z.string(),
        speakerRole: z.string(),
      })),
    }))
    .mutation(async ({ input }) => {
      const falKey = process.env.FAL_API_KEY;
      const elevenKey = process.env.ELEVENLABS_API_KEY;

      const results = await Promise.allSettled(
        input.scenes.map(async (scene) => {
          const [videoResult, audioResult] = await Promise.allSettled([
            falKey ? (async () => {
              try {
                return await generateMangaVideoScene(scene.prompt, falKey);
              } catch {
                return await generateMangaImageScene(scene.prompt, falKey);
              }
            })() : Promise.resolve(null),
            elevenKey ? (async () => {
              const voiceId = VOICE_IDS[scene.speakerRole] || VOICE_IDS.Narrator;
              const buf = await generateVoice(scene.narration, elevenKey, voiceId);
              const { url } = await storagePut(`drama-audio/${input.storyId}/${scene.id}.mp3`, buf, "audio/mpeg");
              return url;
            })() : Promise.resolve(null),
          ]);

          let videoUrl: string | null = null;
          if (videoResult.status === "fulfilled" && videoResult.value) {
            try {
              const mediaUrl = videoResult.value;
              const mediaRes = await fetch(mediaUrl);
              const buf = Buffer.from(await mediaRes.arrayBuffer());
              const isVideo = mediaUrl.includes(".mp4");
              const { url } = await storagePut(
                `drama-scenes/${input.storyId}/${scene.id}.${isVideo ? "mp4" : "jpg"}`,
                buf,
                isVideo ? "video/mp4" : "image/jpeg"
              );
              videoUrl = url;
            } catch {
              videoUrl = videoResult.value;
            }
          }

          return {
            sceneId: scene.id,
            videoUrl,
            audioUrl: audioResult.status === "fulfilled" ? audioResult.value : null,
          };
        })
      );

      return {
        storyId: input.storyId,
        scenes: results.map((r, i) =>
          r.status === "fulfilled"
            ? r.value
            : { sceneId: input.scenes[i].id, videoUrl: null, audioUrl: null }
        ),
      };
    }),
});
