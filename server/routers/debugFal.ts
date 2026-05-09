// Temporary debug router to test fal.ai API from server-side
import { publicProcedure, router } from "../_core/trpc";

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

    // Test 1: minimax-video
    try {
      const r = await fetch("https://fal.run/fal-ai/minimax-video/text-to-video", {
        method: "POST",
        headers: { "Authorization": `Key ${falKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "anime courtroom scene", duration: 6 }),
      });
      results.minimax_status = r.status;
      results.minimax_body = (await r.text()).substring(0, 300);
    } catch (e: unknown) {
      results.minimax_error = e instanceof Error ? e.message : String(e);
    }

    // Test 2: fast-animatediff
    try {
      const r = await fetch("https://fal.run/fal-ai/fast-animatediff/text-to-video", {
        method: "POST",
        headers: { "Authorization": `Key ${falKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "anime courtroom scene, manga style" }),
      });
      results.animatediff_status = r.status;
      results.animatediff_body = (await r.text()).substring(0, 300);
    } catch (e: unknown) {
      results.animatediff_error = e instanceof Error ? e.message : String(e);
    }

    // Test 3: flux/schnell image
    try {
      const r = await fetch("https://fal.run/fal-ai/flux/schnell", {
        method: "POST",
        headers: { "Authorization": `Key ${falKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "anime courtroom scene, manga style, dramatic lighting" }),
      });
      results.flux_status = r.status;
      results.flux_body = (await r.text()).substring(0, 300);
    } catch (e: unknown) {
      results.flux_error = e instanceof Error ? e.message : String(e);
    }

    // Test 4: ElevenLabs
    if (elevenKey) {
      try {
        const r = await fetch("https://api.elevenlabs.io/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb", {
          method: "POST",
          headers: { "xi-api-key": elevenKey, "Content-Type": "application/json" },
          body: JSON.stringify({ text: "Court is now in session.", model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
        });
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
