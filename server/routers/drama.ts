// DRAMAFORGE SCOUT — Drama Router
// Handles fal.ai video generation + ElevenLabs TTS

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";

// ─── fal.ai video generation ─────────────────────────────────────────────────
async function generateMangaVideoScene(prompt: string, falApiKey: string): Promise<string> {
  const response = await fetch("https://fal.run/fal-ai/minimax-video/text-to-video", {
    method: "POST",
    headers: {
      "Authorization": `Key ${falApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      duration: 6,
      aspect_ratio: "16:9",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`fal.ai error: ${response.status} ${err}`);
  }

  const data = await response.json() as { video?: { url?: string } };
  const videoUrl = data?.video?.url;
  if (!videoUrl) throw new Error("fal.ai returned no video URL");
  return videoUrl;
}

// ─── ElevenLabs TTS ──────────────────────────────────────────────────────────
async function generateVoice(text: string, elevenLabsKey: string, voiceId = "JBFqnCBsd6RMkjVDRZzb"): Promise<Buffer> {
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

// Voice IDs per role
const VOICE_IDS: Record<string, string> = {
  Judge: "JBFqnCBsd6RMkjVDRZzb",       // George — deep, authoritative
  Plaintiff: "EXAVITQu4vr4xnSDxMaL",   // Bella — clear, confident
  Defendant: "TxGEqnHWrfWFTfGW9XjX",   // Josh — nervous energy
  Witness: "ThT5KcBeYPX3keUQqHPh",     // Dorothy — excitable
  Narrator: "pNInz6obpgDQGcFmaJgB",    // Adam — cinematic narrator
};

export const dramaRouter = router({
  // Generate a single video scene via fal.ai
  generateScene: publicProcedure
    .input(z.object({
      scenePrompt: z.string(),
      sceneId: z.string(),
      storyId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const falKey = process.env.FAL_API_KEY;
      if (!falKey) throw new Error("FAL_API_KEY not configured");

      try {
        const videoUrl = await generateMangaVideoScene(input.scenePrompt, falKey);

        // Fetch and store in S3 for persistence
        const videoRes = await fetch(videoUrl);
        const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
        const { url: storageUrl } = await storagePut(
          `drama-scenes/${input.storyId}/${input.sceneId}.mp4`,
          videoBuffer,
          "video/mp4"
        );

        return { success: true, videoUrl: storageUrl };
      } catch (err) {
        console.error("[fal.ai] Scene generation failed:", err);
        throw err;
      }
    }),

  // Generate voice audio for a scene line via ElevenLabs
  generateVoice: publicProcedure
    .input(z.object({
      text: z.string().max(500),
      role: z.string(),
      sceneId: z.string(),
      storyId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const elevenKey = process.env.ELEVENLABS_API_KEY;
      if (!elevenKey) throw new Error("ELEVENLABS_API_KEY not configured");

      try {
        const voiceId = VOICE_IDS[input.role] || VOICE_IDS.Narrator;
        const audioBuffer = await generateVoice(input.text, elevenKey, voiceId);

        const { url: storageUrl } = await storagePut(
          `drama-audio/${input.storyId}/${input.sceneId}-${input.role}.mp3`,
          audioBuffer,
          "audio/mpeg"
        );

        return { success: true, audioUrl: storageUrl };
      } catch (err) {
        console.error("[ElevenLabs] Voice generation failed:", err);
        throw err;
      }
    }),

  // Generate all scenes for a drama reel (batch)
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
            falKey ? generateMangaVideoScene(scene.prompt, falKey) : Promise.resolve(null),
            elevenKey ? (async () => {
              const voiceId = VOICE_IDS[scene.speakerRole] || VOICE_IDS.Narrator;
              const buf = await generateVoice(scene.narration, elevenKey, voiceId);
              const { url } = await storagePut(
                `drama-audio/${input.storyId}/${scene.id}.mp3`,
                buf,
                "audio/mpeg"
              );
              return url;
            })() : Promise.resolve(null),
          ]);

          let videoUrl: string | null = null;
          if (videoResult.status === "fulfilled" && videoResult.value) {
            try {
              const videoRes = await fetch(videoResult.value);
              const buf = Buffer.from(await videoRes.arrayBuffer());
              const { url } = await storagePut(
                `drama-scenes/${input.storyId}/${scene.id}.mp4`,
                buf,
                "video/mp4"
              );
              videoUrl = url;
            } catch {
              videoUrl = videoResult.value; // fallback to direct URL
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
