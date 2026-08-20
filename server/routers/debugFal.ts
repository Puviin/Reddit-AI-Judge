// Temporary debug router to test fal.ai API from server-side
import { publicProcedure, router } from "../_core/trpc";
import { requestSpeech, VOICE_IDS } from "../lib/elevenlabs";

const FAL_PROBES = [
  {
    name: "minimax",
    path: "fal-ai/minimax-video/text-to-video",
    body: { prompt: "anime courtroom scene", duration: 6 },
  },
  {
    name: "animatediff",
    path: "fal-ai/fast-animatediff/text-to-video",
    body: { prompt: "anime courtroom scene, manga style" },
  },
  {
    name: "flux",
    path: "fal-ai/flux/schnell",
    body: { prompt: "anime courtroom scene, manga style, dramatic lighting" },
  },
];

export const debugFalRouter = router({
  testFal: publicProcedure.mutation(async () => {
    const falKey = process.env.FAL_API_KEY;
    const elevenKey = process.env.ELEVENLABS_API_KEY;

    const results: Record<string, unknown> = {
      falKeyPresent: !!falKey,
      falKeyPrefix: falKey ? falKey.substring(0, 10) + "..." : "MISSING",
      elevenKeyPresent: !!elevenKey,
    };

    if (!falKey) {
      return { ...results, error: "FAL_API_KEY not set in environment" };
    }

    for (const probe of FAL_PROBES) {
      try {
        const r = await fetch(`https://fal.run/${probe.path}`, {
          method: "POST",
          headers: { Authorization: `Key ${falKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(probe.body),
        });
        results[`${probe.name}_status`] = r.status;
        results[`${probe.name}_body`] = (await r.text()).substring(0, 300);
      } catch (e: unknown) {
        results[`${probe.name}_error`] = e instanceof Error ? e.message : String(e);
      }
    }

    if (elevenKey) {
      try {
        const r = await requestSpeech("Court is now in session.", elevenKey, VOICE_IDS.Judge);
        results.elevenlabs_status = r.status;
        if (!r.ok) results.elevenlabs_error = await r.text();
        else results.elevenlabs_ok = true;
      } catch (e: unknown) {
        results.elevenlabs_error = e instanceof Error ? e.message : String(e);
      }
    }

    return results;
  }),
});
