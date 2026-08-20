// Shared fal.ai helpers: video generation with an image fallback.

import { fal } from "@fal-ai/client";

export const FAL_VIDEO_MODEL = "fal-ai/ltx-2.3/text-to-video/fast";
export const FAL_IMAGE_MODEL = "fal-ai/flux/schnell";

async function runFal<T>(
  model: string,
  input: Record<string, unknown>,
  apiKey: string
): Promise<T> {
  fal.config({ credentials: apiKey });
  return (await fal.run(model, { input })) as T;
}

/** LTX 2.3 Fast text-to-video. */
export async function generateVideo(prompt: string, apiKey: string): Promise<string> {
  const result = await runFal<{ video?: { url?: string } }>(
    FAL_VIDEO_MODEL,
    {
      prompt,
      duration: "6",
      resolution: "1080p",
      aspect_ratio: "16:9",
      fps: "24",
      generate_audio: false,
    },
    apiKey
  );

  const videoUrl = result?.video?.url;
  if (!videoUrl) throw new Error(`LTX 2.3 Fast returned no video URL: ${JSON.stringify(result)}`);
  return videoUrl;
}

/** Flux schnell still image, used when video generation fails. */
export async function generateFallbackImage(prompt: string, apiKey: string): Promise<string> {
  const result = await runFal<{ images?: Array<{ url?: string }> }>(
    FAL_IMAGE_MODEL,
    {
      prompt: `${prompt}, high quality, cinematic, anime style`,
      image_size: "landscape_16_9",
      num_inference_steps: 4,
      num_images: 1,
    },
    apiKey
  );

  const imageUrl = result?.images?.[0]?.url;
  if (!imageUrl) throw new Error(`fal.ai returned no image URL: ${JSON.stringify(result)}`);
  return imageUrl;
}
